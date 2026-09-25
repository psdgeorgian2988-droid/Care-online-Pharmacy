import { orderPayableRupees } from "./partnerCollect.js";
import { formatInr } from "./salesReport.js";

export const REFUND_STEPS = [
  { key: "pending", label: "Refund pending" },
  { key: "processing", label: "Refund processing" },
  { key: "refunded", label: "Refunded" },
  { key: "rejected", label: "Refund declined" },
];

export function refundTrackKey(order) {
  const status = String(order?.refundStatus || "").toLowerCase();
  return REFUND_STEPS.some((row) => row.key === status) ? status : "";
}

export function refundStatusLabel(key, order) {
  const step = String(key || "").toLowerCase();
  if (step === "refunded") {
    const amount = Number(order?.refundAmount || 0);
    return amount > 0 ? `Refunded ${formatInr(amount)}` : "Refunded";
  }
  return REFUND_STEPS.find((row) => row.key === step)?.label || "";
}

export function isRefundOrder(order) {
  if (refundTrackKey(order)) return true;
  const ret = String(order?.returnStatus || "").toLowerCase();
  return ret === "requested" || ret === "collected" || ret === "received" || ret === "returned";
}

export function refundAmountOf(order) {
  const named = Number(order?.refundAmount);
  if (Number.isFinite(named) && named > 0) return named;
  return Math.max(0, Number(orderPayableRupees(order) || 0));
}

export function refundPendingFields(now = Date.now(), extras = {}) {
  const amount = Number(extras.refundAmount ?? extras.amount ?? 0);
  return {
    refundStatus: "pending",
    refundAmount: amount > 0 ? amount : undefined,
    refundUpdatedAt: now,
    status: "Refund pending",
  };
}

export function refundUpdateFields(status, extras = {}, now = Date.now()) {
  const key = String(status || "").toLowerCase();
  const amount = Number(extras.refundAmount ?? extras.amount);
  return {
    refundStatus: key,
    refundAmount: Number.isFinite(amount) && amount > 0 ? amount : extras.refundAmount,
    refundNote: String(extras.refundNote || extras.note || "").trim().slice(0, 240),
    refundUpdatedAt: now,
    status: refundStatusLabel(key, { refundAmount: amount }),
  };
}
