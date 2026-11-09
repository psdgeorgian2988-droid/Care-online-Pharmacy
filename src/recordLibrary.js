import { apiFetch } from "./apiBase.js";
import { listReportFiles, mergeOrderReportIntoStore, orderHasReport } from "./labPipeline.js";

function orderNumber(order) {
  return String(order?.id || order?.bookingId || order?.requestId || "");
}

async function orderWithReportFile(order, fetchImpl) {
  if (!orderHasReport(order)) return order;
  if (listReportFiles(order).some((file) => file.fileData)) return order;
  const id = orderNumber(order);
  if (!id) return order;
  const detail = await fetchImpl(`/api/orders/lookup?id=${encodeURIComponent(id)}`);
  const body = await detail.json().catch(() => ({}));
  return detail.ok && body.order ? body.order : order;
}

/** Save booking reports for this mobile into the record library on this device. */
export async function pullRecordLibrary(
  mobile,
  { people = [], storage = globalThis.localStorage, fetchImpl = apiFetch } = {}
) {
  const digits = String(mobile || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return { orders: [], records: [] };
  const res = await fetchImpl(`/api/orders/mine?mobile=${encodeURIComponent(digits)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not open records.");
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const records = [];
  for (const order of orders) {
    const full = await orderWithReportFile(order, fetchImpl);
    if (!orderHasReport(full)) continue;
    const saved = mergeOrderReportIntoStore(full, storage, people);
    if (saved) records.push(saved);
  }
  return { orders, records };
}
