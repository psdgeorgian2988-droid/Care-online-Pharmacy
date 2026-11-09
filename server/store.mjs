import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "orders.json");
const sqliteFile = path.join(dataDir, "orders.sqlite");

const TERMINAL_TRACK = new Set(["done", "declined", "cancelled"]);
const TRACK_RANKS = {
  requested: 1,
  slot_offered: 2,
  confirmed: 3,
  assigned: 4,
  sample_collected: 5,
  processing: 6,
  packed: 7,
  picked_up: 8,
  report_ready: 9,
  report_uploaded: 10,
  on_the_way: 11,
  arriving: 12,
  done: 13,
  declined: 13,
  cancelled: 13,
};
const KEEP_IF_EMPTY = [
  "partnerId",
  "partnerName",
  "partnerMobile",
  "partnerRole",
  "partner",
  "partnerAssignedAt",
  "partnerConfirmed",
  "partnerConfirmStatus",
  "partnerConfirmedAt",
  "pharmacyPartnerId",
  "pharmacyPartnerName",
  "deliveryPartnerId",
  "deliveryPartnerName",
  "technicianName",
  "technicianMobile",
  "technicianAssignedAt",
  "teamMemberId",
  "sampleCollectedAt",
  "reportFileName",
  "reportFileData",
  "reportFileType",
  "reportFiles",
  "reportUploadedAt",
  "reportTestName",
  "reportNotes",
  "accessionNo",
  "barcodeValue",
  "analyzerName",
  "analyzerRef",
  "collectorLat",
  "collectorLng",
  "collectorLive",
  "reportResults",
  "samples",
  "qcPassed",
  "sampleStatus",
];

async function ensureFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify({ orders: [] }, null, 2)}\n`);
  }
}

async function readJsonStore() {
  await ensureFile();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return { orders: Array.isArray(parsed?.orders) ? parsed.orders : [] };
  } catch {
    return { orders: [] };
  }
}

async function writeJsonStore(store) {
  await ensureFile();
  await writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`);
}

let dbPromise;
async function ordersDb() {
  if (process.env.NODE_TEST_CONTEXT) return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const { DatabaseSync } = await import("node:sqlite");
        await mkdir(dataDir, { recursive: true });
        const db = new DatabaseSync(sqliteFile);
        db.exec(`CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          updated_at INTEGER NOT NULL DEFAULT 0,
          body TEXT NOT NULL
        )`);
        return db;
      } catch {
        return null;
      }
    })();
  }
  return dbPromise;
}

function readSqlite(db) {
  return db
    .prepare("SELECT body FROM orders")
    .all()
    .map((row) => {
      try {
        return JSON.parse(row.body);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function writeSqlite(db, orders) {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM orders");
    const insert = db.prepare("INSERT INTO orders (id, updated_at, body) VALUES (?, ?, ?)");
    for (const order of orders) {
      const id = orderIdKey(order);
      if (!id) continue;
      insert.run(id, Number(order.updatedAt || order.sortKey || 0) || 0, JSON.stringify(order));
    }
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* the transaction may already be closed */
    }
    throw error;
  }
}

async function readStore() {
  const db = await ordersDb();
  if (db) {
    const orders = readSqlite(db);
    if (orders.length) return { orders };
  }
  const json = await readJsonStore();
  if (db && json.orders.length) writeSqlite(db, json.orders);
  return json;
}

async function writeStore(store) {
  const orders = Array.isArray(store?.orders) ? store.orders : [];
  const db = await ordersDb();
  if (db) writeSqlite(db, orders);
  await writeJsonStore({ orders });
}

export function orderIdKey(record) {
  return String(record?.id || record?.bookingId || record?.requestId || "").trim();
}

/** One shared record per job id so admin, partner, and customer see the same row. */
export function orderKey(record) {
  return orderIdKey(record);
}

export function trackStatusRank(status) {
  const key = String(status || "").toLowerCase();
  return TRACK_RANKS[key] || 0;
}

function isTerminalTrack(status) {
  return TERMINAL_TRACK.has(String(status || "").toLowerCase());
}

export function staffOrderKind(record) {
  const raw = String(record?.kind || record?.orderType || record?.serviceType || "")
    .toLowerCase()
    .trim();
  if (raw === "cart") return "medicine";
  return raw || "medicine";
}

export function mergeIncomingOrder(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming || typeof incoming !== "object") return existing;
  const next = { ...existing, ...incoming };
  const kind = staffOrderKind(incoming.kind ? incoming : existing);
  next.kind = kind;
  next.orderType = incoming.orderType || existing.orderType || kind;

  const incStatus = String(incoming.trackStatus || "").toLowerCase();
  const exStatus = String(existing.trackStatus || "").toLowerCase();
  const incomingTerminal = isTerminalTrack(incStatus);
  const existingTerminal = isTerminalTrack(exStatus);
  const regress =
    incStatus &&
    !incomingTerminal &&
    (existingTerminal || trackStatusRank(incStatus) < trackStatusRank(exStatus));

  if (regress) {
    next.trackStatus = existing.trackStatus;
    next.status = existing.status;
    next.trackCompleted = existing.trackCompleted;
    next.partnerConfirmed = existing.partnerConfirmed;
    next.partnerConfirmStatus = existing.partnerConfirmStatus;
    next.partnerConfirmedAt = existing.partnerConfirmedAt;
  }

  for (const key of KEEP_IF_EMPTY) {
    if ((next[key] == null || next[key] === "") && existing[key] != null && existing[key] !== "") {
      next[key] = existing[key];
    }
  }

  return next;
}

export async function upsertOrder(record) {
  if (!record || typeof record !== "object") return null;
  const id = orderIdKey(record);
  if (!id) return null;
  const kind = staffOrderKind(record);
  const incoming = {
    ...record,
    kind,
    orderType: record.orderType || kind,
  };
  const store = await readStore();
  const index = store.orders.findIndex((row) => orderIdKey(row) === id);
  const next =
    index >= 0
      ? { ...mergeIncomingOrder(store.orders[index], incoming), updatedAt: Date.now() }
      : { ...incoming, updatedAt: Date.now() };
  if (index >= 0) store.orders[index] = next;
  else store.orders.unshift(next);
  await writeStore(store);
  return next;
}

/** Admin and staff always receive the full history. Orders are never pruned. */
export async function listOrders() {
  const store = await readStore();
  return [...store.orders].sort(
    (a, b) => (Number(b.updatedAt || b.sortKey || 0) || 0) - (Number(a.updatedAt || a.sortKey || 0) || 0)
  );
}

export async function patchOrder(id, patch) {
  const store = await readStore();
  const wanted = String(id || "");
  const index = store.orders.findIndex((row) => orderIdKey(row) === wanted);
  if (index < 0) return null;
  const merged = { ...store.orders[index], ...patch };
  const kind = staffOrderKind(merged);
  store.orders[index] = {
    ...merged,
    kind,
    orderType: merged.orderType || kind,
    updatedAt: Date.now(),
  };
  await writeStore(store);
  return store.orders[index];
}
