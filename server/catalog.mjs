import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { itemBrand, skuKey } from "../src/stockReport.js";
import { setStock } from "./stock.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "catalog.json");
const MAX_FILE_CHARS = 2_000_000;

const EMPTY = {
  medicines: [],
  hiddenMedicineIds: [],
  services: [],
  hiddenServiceIds: [],
  purchases: [],
  batches: [],
  coupons: [],
  app: { ticker: "", headline: "" },
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clipText(value, max = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function qty(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

async function ensureFile() {
  await mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify(EMPTY, null, 2)}\n`);
  }
}

function normalizeStore(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    medicines: asArray(data.medicines),
    hiddenMedicineIds: asArray(data.hiddenMedicineIds).map(String),
    services: asArray(data.services),
    hiddenServiceIds: asArray(data.hiddenServiceIds).map(String),
    purchases: asArray(data.purchases),
    batches: asArray(data.batches),
    coupons: asArray(data.coupons),
    app: {
      ticker: clipText(data.app?.ticker, 160),
      headline: clipText(data.app?.headline, 160),
    },
  };
}

async function readStore() {
  await ensureFile();
  try {
    return normalizeStore(JSON.parse(await readFile(dataFile, "utf8")));
  } catch {
    return normalizeStore(EMPTY);
  }
}

async function writeStore(store) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(normalizeStore(store), null, 2)}\n`);
  return normalizeStore(store);
}

function normalizeMedicine(body, existing = {}) {
  const name = clipText(body?.name || existing.name, 120);
  const salt = clipText(body?.salt || existing.salt, 80);
  const strength = clipText(body?.strength || existing.strength, 40);
  const brand = clipText(body?.brand || existing.brand || "MediHome", 60) || "MediHome";
  if (!name) return null;
  const aliases = asArray(body?.aliases ?? existing.aliases)
    .map((row) => clipText(row, 60))
    .filter(Boolean);
  return {
    id: existing.id || body?.id || newId("adm-med"),
    name,
    salt,
    strength,
    composition: clipText(body?.composition || existing.composition || `${salt} ${strength}`, 160),
    packSize: clipText(body?.packSize || existing.packSize || "10 tablets", 40),
    category: clipText(body?.category || existing.category || "Other", 40),
    mrp: money(body?.mrp ?? existing.mrp),
    price: money(body?.price ?? existing.price ?? body?.mrp ?? existing.mrp),
    prescription: Boolean(body?.prescription ?? existing.prescription ?? true),
    brand,
    isMediHome:
      body?.isMediHome ??
      existing.isMediHome ??
      String(brand).toLowerCase() === "medihome",
    aliases,
    source: "admin",
    updatedAt: Date.now(),
  };
}

function normalizeService(body, existing = {}) {
  const name = clipText(body?.name || existing.name, 120);
  const kind = clipText(body?.kind || existing.kind || "homecare", 32).toLowerCase();
  if (!name) return null;
  return {
    id: existing.id || body?.id || newId("adm-svc"),
    kind,
    group: clipText(body?.group || existing.group, 40),
    name,
    price: money(body?.price ?? existing.price),
    description: clipText(body?.description || existing.description, 240),
    source: "admin",
    updatedAt: Date.now(),
  };
}

function normalizeCoupon(body, existing = {}) {
  const code = clipText(body?.code || existing.code, 24).toUpperCase();
  if (!code) return null;
  const percent = money(body?.percent ?? existing.percent);
  const amount = money(body?.amount ?? existing.amount);
  return {
    code,
    percent: percent > 0 ? percent : 0,
    amount: amount > 0 ? amount : 0,
    label: clipText(
      body?.label || existing.label || (percent ? `${percent}% off MRP` : `₹${amount} off`),
      80
    ),
  };
}

function normalizePurchase(body, existing = {}) {
  const name = clipText(body?.name || existing.name, 120);
  const qtyValue = qty(body?.qty ?? existing.qty);
  if (!name || !qtyValue) return null;
  const item = {
    id: existing.id || body?.id || newId("pur"),
    name,
    brand: clipText(body?.brand || existing.brand || "MediHome", 60),
    salt: clipText(body?.salt || existing.salt, 80),
    strength: clipText(body?.strength || existing.strength, 40),
    packSize: clipText(body?.packSize || existing.packSize, 40),
    qty: qtyValue,
    unitCost: money(body?.unitCost ?? existing.unitCost),
    outletId: clipText(body?.outletId || existing.outletId || "unassigned", 40),
    outletName: clipText(body?.outletName || existing.outletName, 80),
    invoiceNo: clipText(body?.invoiceNo || existing.invoiceNo, 40),
    supplier: clipText(body?.supplier || existing.supplier, 80),
    notes: clipText(body?.notes || existing.notes, 240),
    fileName: clipText(body?.fileName || existing.fileName, 120),
    fileType: clipText(body?.fileType || existing.fileType, 80),
    fileData: String(body?.fileData || existing.fileData || "").slice(0, MAX_FILE_CHARS),
    boughtAt: clipText(body?.boughtAt || existing.boughtAt, 40),
    createdAt: existing.createdAt || Date.now(),
  };
  item.skuKey = skuKey(item);
  return item;
}

function normalizeBatch(body, existing = {}) {
  const productName = clipText(body?.productName || existing.productName, 120);
  const batchNo = clipText(body?.batchNo || existing.batchNo, 40).toUpperCase();
  if (!productName || !batchNo) return null;
  const fileData = String(body?.fileData || existing.fileData || "");
  return {
    id: existing.id || body?.id || newId("bat"),
    productId: String(body?.productId || existing.productId || ""),
    productName,
    composition: clipText(body?.composition || existing.composition, 160),
    strength: clipText(body?.strength || existing.strength, 40),
    batchNo,
    mfgDate: clipText(body?.mfgDate || existing.mfgDate, 20),
    expiryDate: clipText(body?.expiryDate || existing.expiryDate, 20),
    notes: clipText(body?.notes || existing.notes, 240),
    fileName: clipText(body?.fileName || existing.fileName, 120),
    fileType: clipText(body?.fileType || existing.fileType, 80),
    fileData: fileData.slice(0, MAX_FILE_CHARS),
    savedAt: existing.savedAt || new Date().toLocaleString("en-IN"),
    createdAt: existing.createdAt || Date.now(),
  };
}

async function applyPurchaseToStock(purchase) {
  if (!purchase) return;
  const { listStock } = await import("./stock.mjs");
  const current = (await listStock()).find(
    (row) => row.outletId === purchase.outletId && row.skuKey === purchase.skuKey
  );
  await setStock({
    outletId: purchase.outletId,
    skuKey: purchase.skuKey,
    qty: Number(current?.qty || 0) + purchase.qty,
    name: purchase.name,
    brand: purchase.brand || itemBrand(purchase),
    salt: purchase.salt,
    packSize: purchase.packSize,
    outletName: purchase.outletName,
  });
}

export function splitCsvLine(line) {
  const out = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

export function parsePurchaseCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((row) => row.toLowerCase().replace(/\s+/g, ""));
  const index = (names) => {
    for (const name of names) {
      const at = headers.indexOf(name);
      if (at >= 0) return at;
    }
    return -1;
  };
  const col = {
    name: index(["name", "sku", "medicine", "product"]),
    brand: index(["brand"]),
    salt: index(["salt", "composition"]),
    strength: index(["strength"]),
    qty: index(["qty", "quantity", "packs"]),
    unitCost: index(["unitcost", "cost", "rate", "price"]),
    outletId: index(["outletid", "storeid", "outlet"]),
    outletName: index(["outletname", "store"]),
    invoiceNo: index(["invoiceno", "invoice", "bill"]),
    supplier: index(["supplier", "vendor"]),
    packSize: index(["packsize", "pack"]),
    boughtAt: index(["boughtat", "date"]),
  };
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const pick = (key) => (col[key] >= 0 ? cells[col[key]] : "");
    const row = normalizePurchase({
      name: pick("name"),
      brand: pick("brand"),
      salt: pick("salt"),
      strength: pick("strength"),
      qty: pick("qty"),
      unitCost: pick("unitCost"),
      outletId: pick("outletId"),
      outletName: pick("outletName"),
      invoiceNo: pick("invoiceNo"),
      supplier: pick("supplier"),
      packSize: pick("packSize"),
      boughtAt: pick("boughtAt"),
    });
    if (row) rows.push(row);
  }
  return rows;
}

export async function readCatalog() {
  return readStore();
}

export function publicCatalog(store) {
  return {
    medicines: store.medicines,
    hiddenMedicineIds: store.hiddenMedicineIds,
    services: store.services,
    hiddenServiceIds: store.hiddenServiceIds,
    coupons: store.coupons,
    app: store.app,
    batches: store.batches.map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      batchNo: row.batchNo,
      mfgDate: row.mfgDate,
      expiryDate: row.expiryDate,
    })),
  };
}

export async function addMedicine(body) {
  const store = await readStore();
  const row = normalizeMedicine(body);
  if (!row) throw new Error("Medicine name is required.");
  store.medicines = [row, ...store.medicines.filter((item) => String(item.id) !== String(row.id))];
  store.hiddenMedicineIds = store.hiddenMedicineIds.filter((id) => id !== String(row.id));
  return writeStore(store);
}

export async function removeMedicine(id) {
  const wanted = String(id || "").trim();
  if (!wanted) throw new Error("Medicine id is required.");
  const store = await readStore();
  const admin = store.medicines.find((row) => String(row.id) === wanted);
  if (admin) {
    store.medicines = store.medicines.filter((row) => String(row.id) !== wanted);
  } else if (!store.hiddenMedicineIds.includes(wanted)) {
    store.hiddenMedicineIds = [...store.hiddenMedicineIds, wanted];
  }
  return writeStore(store);
}

export async function restoreMedicine(id) {
  const wanted = String(id || "").trim();
  const store = await readStore();
  store.hiddenMedicineIds = store.hiddenMedicineIds.filter((row) => row !== wanted);
  return writeStore(store);
}

export async function addService(body) {
  const store = await readStore();
  const row = normalizeService(body);
  if (!row) throw new Error("Service name is required.");
  store.services = [row, ...store.services.filter((item) => item.id !== row.id)];
  store.hiddenServiceIds = store.hiddenServiceIds.filter((id) => id !== row.id);
  return writeStore(store);
}

export async function removeService(id) {
  const wanted = String(id || "").trim();
  if (!wanted) throw new Error("Service id is required.");
  const store = await readStore();
  const admin = store.services.find((row) => row.id === wanted);
  if (admin) {
    store.services = store.services.filter((row) => row.id !== wanted);
  } else if (!store.hiddenServiceIds.includes(wanted)) {
    store.hiddenServiceIds = [...store.hiddenServiceIds, wanted];
  }
  return writeStore(store);
}

export async function restoreService(id) {
  const wanted = String(id || "").trim();
  const store = await readStore();
  store.hiddenServiceIds = store.hiddenServiceIds.filter((row) => row !== wanted);
  return writeStore(store);
}

export async function addPurchase(body) {
  const store = await readStore();
  const row = normalizePurchase(body);
  if (!row) throw new Error("Purchase needs a medicine name and quantity.");
  store.purchases = [row, ...store.purchases];
  await applyPurchaseToStock(row);
  return writeStore(store);
}

export async function importPurchases(csvText) {
  const rows = parsePurchaseCsv(csvText);
  if (!rows.length) throw new Error("No purchase rows found in that file.");
  const store = await readStore();
  store.purchases = [...rows, ...store.purchases];
  for (const row of rows) {
    await applyPurchaseToStock(row);
  }
  return writeStore(store);
}

export async function removePurchase(id) {
  const wanted = String(id || "").trim();
  const store = await readStore();
  store.purchases = store.purchases.filter((row) => row.id !== wanted);
  return writeStore(store);
}

export async function addBatch(body) {
  const store = await readStore();
  const row = normalizeBatch(body);
  if (!row) throw new Error("Batch number and medicine name are required.");
  if (!row.fileName) throw new Error("Upload a batch report (PDF or image).");
  store.batches = [row, ...store.batches];
  return writeStore(store);
}

export async function removeBatch(id) {
  const wanted = String(id || "").trim();
  const store = await readStore();
  store.batches = store.batches.filter((row) => row.id !== wanted);
  return writeStore(store);
}

export async function patchApp(body) {
  const store = await readStore();
  if (body?.app && typeof body.app === "object") {
    store.app = {
      ticker: clipText(body.app.ticker ?? store.app.ticker, 160),
      headline: clipText(body.app.headline ?? store.app.headline, 160),
    };
  }
  if (Array.isArray(body?.coupons)) {
    store.coupons = body.coupons.map((row) => normalizeCoupon(row)).filter(Boolean);
  } else if (body?.coupon) {
    const row = normalizeCoupon(body.coupon);
    if (!row) throw new Error("Coupon code is required.");
    store.coupons = [row, ...store.coupons.filter((item) => item.code !== row.code)];
  } else if (body?.removeCoupon) {
    const code = clipText(body.removeCoupon, 24).toUpperCase();
    store.coupons = store.coupons.filter((row) => row.code !== code);
  }
  return writeStore(store);
}
