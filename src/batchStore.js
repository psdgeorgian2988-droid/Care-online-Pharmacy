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
  return (
    batches.find((item) => Number(item.productId) === Number(productId)) || null
  );
}
