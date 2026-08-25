import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "orders.json");

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

export function orderKey(record) {
  return `${record?.kind || "unknown"}:${record?.id || record?.bookingId || record?.requestId || ""}`;
}

export async function upsertOrder(record) {
  if (!record || typeof record !== "object") return null;
  const store = await readStore();
  const next = {
    ...record,
    updatedAt: Date.now(),
  };
  const key = orderKey(next);
  if (!String(next.id || next.bookingId || next.requestId || "")) return null;
  const index = store.orders.findIndex((row) => orderKey(row) === key);
  if (index >= 0) store.orders[index] = { ...store.orders[index], ...next };
  else store.orders.unshift(next);
  await writeStore(store);
  return next;
}

export async function listOrders() {
  const store = await readStore();
  return [...store.orders].sort(
    (a, b) => (Number(b.updatedAt || b.sortKey || 0) || 0) - (Number(a.updatedAt || a.sortKey || 0) || 0)
  );
}

export async function patchOrder(id, patch) {
  const store = await readStore();
  const wanted = String(id || "");
  const index = store.orders.findIndex(
    (row) =>
      String(row.id) === wanted ||
      String(row.bookingId) === wanted ||
      String(row.requestId) === wanted
  );
  if (index < 0) return null;
  store.orders[index] = {
    ...store.orders[index],
    ...patch,
    updatedAt: Date.now(),
  };
  await writeStore(store);
  return store.orders[index];
}
