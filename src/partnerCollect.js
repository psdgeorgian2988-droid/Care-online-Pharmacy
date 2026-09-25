import { isOnlinePayment, paymentMethodLabel } from "./paymentMethods.js";
import { resolveCollector, splitPayment } from "./paymentSplit.js";
import { stepdownBalanceDue, stepdownBillTotal } from "./stepdownBill.js";

export function lineItemsPayable(order = {}) {
  const rows = [
    ...(Array.isArray(order.items) ? order.items : []),
    ...(Array.isArray(order.tests) ? order.tests : []),
  ];
  return rows.reduce((sum, row) => {
    const qty = Math.max(1, Number(row?.quantity) || 1);
    return sum + Number(row?.price || row?.amount || 0) * qty;
  }, 0);
}

export function orderPayableRupees(order = {}) {
  const kind = String(order?.kind || order?.orderType || "").toLowerCase();
  if (kind === "stepdown") {
    const stay = stepdownBalanceDue(order);
    if (stay > 0) return stay;
    const billed = stepdownBillTotal(order);
    if (billed > 0) return billed;
  }
  const named = Number(
    order.split?.payableRupees ?? order.total ?? order.charges ?? 0
  );
  if (Number.isFinite(named) && named > 0) return named;
  return Math.max(0, lineItemsPayable(order));
}

export function roundCollectRupees(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export function defaultSplitParts(payable) {
  return [
    { method: "cod", amountRupees: "" },
    { method: "upi", amountRupees: "" },
  ];
}

export function normalizePaymentParts(parts) {
  if (!Array.isArray(parts)) return [];
  return parts
    .map((row) => ({
      method: String(row?.method || "").toLowerCase(),
      amountRupees: roundCollectRupees(row?.amountRupees),
    }))
    .filter((row) => row.method && row.amountRupees > 0);
}

export function paymentPartsTotal(parts) {
  return roundCollectRupees(
    normalizePaymentParts(parts).reduce((sum, row) => sum + row.amountRupees, 0)
  );
}

export function splitCollectionError(parts, payable) {
  const list = normalizePaymentParts(parts);
  const target = roundCollectRupees(payable);
  if (list.length < 2) return "Enter amounts for two payment methods.";
  const methods = new Set(list.map((row) => row.method));
  if (methods.size < 2) return "Choose two different payment methods.";
  if (Math.abs(paymentPartsTotal(list) - target) > 0.009) {
    return `Split amounts must add up to ₹${target.toLocaleString("en-IN")}.`;
  }
  return "";
}

export function collectionMethodFromParts(parts, fallback = "cod") {
  const list = normalizePaymentParts(parts);
  if (list.length > 1) return "split";
  if (list.length === 1) return list[0].method;
  return isOnlinePayment(fallback) ? String(fallback) : "cod";
}

export function paymentPartsLabel(parts, cashLabel = "Cash / COD") {
  const list = normalizePaymentParts(parts);
  if (!list.length) return "Split payment";
  return list
    .map(
      (row) =>
        `${paymentMethodLabel(row.method, cashLabel)} ₹${row.amountRupees.toLocaleString("en-IN")}`
    )
    .join(" + ");
}

export function isPaidOrder(order = {}) {
  return (
    String(order?.paymentStatus || "").toLowerCase() === "paid" ||
    order?.paid === true
  );
}

export function paidOnCustomerApp(order = {}) {
  if (!isPaidOrder(order)) return false;
  return (
    String(order?.paidOn || "").toLowerCase() === "customer" ||
    String(order?.collector || "").toLowerCase() === "medihome"
  );
}

export function normalizeReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") return null;
  const fileData = String(receipt.fileData || receipt.receiptFileData || "");
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(fileData)) return null;
  if (fileData.length > 1_800_000) return null;
  return {
    receiptFileName: String(receipt.fileName || receipt.receiptFileName || "receipt.jpg")
      .trim()
      .slice(0, 160),
    receiptFileType: String(receipt.fileType || receipt.receiptFileType || "image/jpeg")
      .trim()
      .slice(0, 80),
    receiptFileData: fileData.slice(0, 1_800_000),
    receiptCapturedAt: Number(receipt.capturedAt || receipt.receiptCapturedAt) || Date.now(),
  };
}

export function receiptError(receipt) {
  return normalizeReceipt(receipt) ? "" : "Take a photo of the payment receipt.";
}

export function partnerCollectPatch(existing = {}, body = {}, now = Date.now()) {
  const payable = orderPayableRupees(existing);
  const parts = normalizePaymentParts(body.paymentParts);
  const useSplit = Boolean(body.splitCollection) || parts.length > 1;
  if (useSplit) {
    const error = splitCollectionError(parts, payable);
    if (error) return { ok: false, error };
  }
  const gatewayPaid = Boolean(body.paymentId || body.razorpayPaymentId);
  const receipt = normalizeReceipt(body.receipt || body);
  if (!receipt && !gatewayPaid) return { ok: false, error: receiptError(body.receipt) };
  const paymentMethod = useSplit
    ? "split"
    : isOnlinePayment(body.paymentMethod)
      ? String(body.paymentMethod)
      : "cod";
  const paidOn = "partner";
  const collector = resolveCollector({ method: paymentMethod, paidOn });
  const kind = existing.kind || existing.orderType || "medicine";
  const pin = existing.pinCode || existing.pin || "";
  return {
    ok: true,
    patch: {
      paidOn,
      collector,
      paymentMethod,
      paymentParts: useSplit ? parts : [],
      paymentId: String(body.paymentId || ""),
      razorpayPaymentId: String(body.razorpayPaymentId || ""),
      paymentStatus: "paid",
      paid: true,
      status: "Completed",
      trackStatus: "done",
      trackCompleted: true,
      completedAt: now,
      partnerConfirmed: true,
      partnerConfirmStatus:
        existing.partnerConfirmStatus === "declined"
          ? existing.partnerConfirmStatus
          : "accepted",
      ...receipt,
      split: {
        ...splitPayment(kind, payable, pin, {
          saleRupees:
            existing.split?.saleRupees ?? existing.saleRupees ?? payable,
          payableRupees: existing.split?.payableRupees ?? payable,
          couponCode: existing.split?.couponCode || existing.couponCode || "",
          platformPercent: existing.split?.platformPercent,
          partnerPercent: existing.split?.partnerPercent,
          paymentMethod,
          paidOn,
        }),
        staffSet: Boolean(existing.split?.staffSet),
      },
    },
  };
}
