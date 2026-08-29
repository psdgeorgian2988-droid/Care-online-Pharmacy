import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { itemBrand, skuKey } from "../src/stockReport.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "stock.json");

async function ensureFile() {
  await mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify({ items: [] }, null, 2)}\n`);
  }
}

async function readStore() {
  await ensureFile();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return { items: Array.isArray(parsed?.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeStore(store) {
  await ensureFile();
  await writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`);
}

export async function listStock() {
  const store = await readStore();
  return store.items;
}

export async function setStock({ outletId, skuKey: key, qty, name, brand, salt, packSize, outletName }) {
  const id = String(outletId || "").trim();
  const sku = String(key || "").trim();
  if (!id || !sku) return null;
  const nextQty = Math.max(0, Math.round(Number(qty) || 0));
  const store = await readStore();
  const index = store.items.findIndex(
    (row) => row.outletId === id && row.skuKey === sku
  );
  const row = {
    outletId: id,
    skuKey: sku,
    qty: nextQty,
    name: name || store.items[index]?.name || sku,
    brand: brand || store.items[index]?.brand || "Unknown",
    salt: salt || store.items[index]?.salt || "",
    packSize: packSize || store.items[index]?.packSize || "",
    outletName: outletName || store.items[index]?.outletName || "",
    updatedAt: Date.now(),
  };
  if (index >= 0) store.items[index] = { ...store.items[index], ...row };
  else store.items.push(row);
  await writeStore(store);
  return row;
}

export async function deductOrderStock(order) {
  if (!order || order.stockDeducted) return order;
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return order;
  const outletId = String(order.outletId || "unassigned");
  const store = await readStore();
  for (const item of items) {
    const key = skuKey(item);
    const qty = Number(item.quantity);
    const take = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const index = store.items.findIndex(
      (row) => row.outletId === outletId && row.skuKey === key
    );
    if (index >= 0) {
      store.items[index].qty = Math.max(0, Number(store.items[index].qty || 0) - take);
      store.items[index].updatedAt = Date.now();
    } else {
      store.items.push({
        outletId,
        skuKey: key,
        qty: 0,
        name: item.name || key,
        brand: itemBrand(item),
        salt: item.salt || "",
        packSize: item.packSize || "",
        outletName: order.outletName || "",
        updatedAt: Date.now(),
      });
    }
  }
  await writeStore(store);
  return { ...order, stockDeducted: true };
}
