import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "orders.json");

const TERMINAL_TRACK = new Set(["done", "declined", "cancelled"]);
const TRACK_RANKS = {
  requested: 1,
  slot_offered: 2,
  confirmed: 3,
  assigned: 4,
  sample_collected: 5,
  packed: 6,
  picked_up: 7,
  report_ready: 8,
  on_the_way: 9,
  arriving: 10,
  done: 11,
  declined: 11,
  cancelled: 11,
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
  "sampleCollectedAt",
  "reportFileName",
  "reportFileData",
  "reportFileType",
  "reportUploadedAt",
  "reportTestName",
  "reportNotes",
];

async function ensureFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify({ orders: [] }, null, 2)}\n`);
  }
}

async function readStore() {
  await ensureFile();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return { orders: Array.isArray(parsed?.orders) ? parsed.orders : [] };
  } catch {
    return { orders: [] };
  }
}

async function writeStore(store) {
  await ensureFile();
  await writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`);
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
