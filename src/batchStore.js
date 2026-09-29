export const BATCH_STORAGE_KEY = "mediHomeBatches";
export const MAX_BATCH_FILE_BYTES = 1.5 * 1024 * 1024;

export function loadBatches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BATCH_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBatches(list) {
  localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function latestBatchForProduct(productId, batches = loadBatches()) {
  return batchesForProduct(productId, batches)[0] || null;
}

export function normalizeBatch(row) {
  if (!row || typeof row !== "object") return null;
  const batchNo = String(row.batchNo || "").trim().toUpperCase();
  if (!batchNo) return null;
  return {
    id: String(row.id || `B-${row.productId || "x"}-${batchNo}`),
    productId: String(row.productId ?? ""),
    productName: String(row.productName || "").trim(),
    batchNo,
    mfgDate: String(row.mfgDate || ""),
    expiryDate: String(row.expiryDate || ""),
    notes: String(row.notes || ""),
    composition: String(row.composition || ""),
    strength: String(row.strength || ""),
    fileName: String(row.fileName || ""),
    fileType: String(row.fileType || ""),
    fileData: String(row.fileData || ""),
  };
}

export function fallbackBatch(medicine) {
  const id = String(medicine?.id ?? "");
  const name = String(medicine?.name || "Medicine").trim() || "Medicine";
  const digits = id.replace(/\D/g, "").padStart(4, "0").slice(-4);
  return {
    id: `lot-${id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    productId: id,
    productName: name,
    batchNo: `MH${digits}A`,
    mfgDate: "2026-03-01",
    expiryDate: "2028-02-01",
    notes: "Current pharmacy lot",
    composition: String(medicine?.composition || medicine?.salt || ""),
    strength: String(medicine?.strength || ""),
    fileName: "",
    fileType: "",
    fileData: "",
  };
}

export function catalogBatches() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem("mediHomeCatalog") || "null");
    const list = Array.isArray(parsed?.batches) ? parsed.batches : [];
    return list.map(normalizeBatch).filter(Boolean);
  } catch {
    return [];
  }
}

export function allCustomerBatches() {
  const seen = new Set();
  const out = [];
  for (const row of [...catalogBatches(), ...loadBatches().map(normalizeBatch)]) {
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function batchesForProduct(productId, batches = allCustomerBatches(), medicine) {
  const wanted = String(productId ?? medicine?.id ?? "");
  const name = String(medicine?.name || "").trim().toLowerCase();
  const hits = (Array.isArray(batches) ? batches : []).filter((row) => {
    if (!row) return false;
    if (wanted && String(row.productId) === wanted) return true;
    return Boolean(name && String(row.productName || "").trim().toLowerCase() === name);
  });
  if (hits.length) return hits;
  return medicine ? [fallbackBatch(medicine)] : [];
}

export function withPickedBatch(item, batch) {
  const picked = batch || latestBatchForProduct(item?.id, allCustomerBatches()) || fallbackBatch(item);
  return {
    ...item,
    batchId: picked.id,
    batchNo: picked.batchNo,
    batchMfgDate: picked.mfgDate,
    batchExpiryDate: picked.batchExpiryDate || picked.expiryDate,
    batchProductName: picked.productName || item?.name || "",
  };
}

export function batchReportHtml(batch) {
  const row = normalizeBatch(batch) || fallbackBatch(batch);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Batch ${row.batchNo}</title>
<style>body{font-family:system-ui,sans-serif;margin:32px;color:#143246}h1{font-size:22px}p{margin:6px 0;color:#34546b}</style>
</head><body>
<h1>MediHome batch report</h1>
<p><strong>Medicine:</strong> ${row.productName || "Medicine"}</p>
<p><strong>Batch no:</strong> ${row.batchNo}</p>
<p><strong>Manufactured:</strong> ${row.mfgDate || "—"}</p>
<p><strong>Expiry:</strong> ${row.expiryDate || "—"}</p>
<p><strong>Notes:</strong> ${row.notes || "QC record from the pharmacy lot."}</p>
</body></html>`;
}

export function openBatchReport(batch) {
  const row = normalizeBatch(batch) || batch;
  if (!row) return;
  if (row.fileData) {
    const opened = globalThis.open?.(row.fileData, "_blank", "noopener,noreferrer");
    if (opened) return;
  }
  const popup = globalThis.open?.("", "_blank", "noopener,noreferrer");
  if (popup?.document) {
    popup.document.write(batchReportHtml(row));
    popup.document.close();
  }
}
