import { refundStatusLabel, refundTrackKey } from "./refundTrack.js";

export const PHARMACY_TRACK_STEPS = [
  { key: "requested", label: "Order placed" },
  { key: "confirmed", label: "Approved by pharmacist" },
  { key: "packed", label: "Packed" },
  { key: "picked_up", label: "Picked up" },
  { key: "on_the_way", label: "On the way" },
  { key: "done", label: "Delivered" },
];

export const PHARMACY_DESK_TABS = [
  { id: "new", label: "New orders", keys: ["requested", "declined"] },
  { id: "approved", label: "Approved", keys: ["confirmed"] },
  { id: "packed", label: "Packed", keys: ["packed"] },
  { id: "picked", label: "Picked", keys: ["picked_up", "on_the_way"] },
  { id: "delivered", label: "Delivered", keys: ["done"] },
  { id: "returns", label: "Return medicine", keys: ["return_requested", "return_collected", "returned", "pending", "processing", "refunded", "rejected"] },
];

export function isPharmacyOrder(order) {
  const kind = String(order?.kind || order?.orderType || "").toLowerCase();
  return kind === "medicine" || kind === "cart";
}

export function pharmacyReturnKey(order) {
  const status = String(order?.returnStatus || "").toLowerCase();
  if (status === "received" || status === "returned") return "returned";
  if (status === "collected") return "return_collected";
  if (status === "requested") return "return_requested";
  return "";
}

export function pharmacyStatusLabel(key) {
  const step = String(key || "").toLowerCase();
  if (step === "declined") return "Declined";
  if (step === "arriving") return "On the way";
  if (step === "return_requested") return "Return requested";
  if (step === "return_collected") return "Return collected";
  if (step === "returned") return "Returned";
  if (step === "pending" || step === "processing" || step === "refunded" || step === "rejected") {
    return refundStatusLabel(step);
  }
  return PHARMACY_TRACK_STEPS.find((row) => row.key === step)?.label || "Order placed";
}

export function pharmacyTrackKey(order) {
  if (!order) return "requested";
  const refund = refundTrackKey(order);
  if (refund) return refund;
  const returned = pharmacyReturnKey(order);
  if (returned) return returned;
  const status = String(order.trackStatus || "").toLowerCase();
  if (status === "declined") return "declined";
  if (order.trackCompleted || status === "done") return "done";
  if (order.checkDeliverAt || order.qrReceivedAt) return "done";
  if (status === "on_the_way" || status === "arriving") return "on_the_way";
  if (status === "picked_up" || order.checkPickupAt || order.qrPickedAt) {
    return status === "picked_up" ? "picked_up" : "on_the_way";
  }
  if (status === "packed" || order.checkPackAt || order.qrPackedAt) return "packed";
  if (
    order.partnerConfirmed === true ||
    String(order.partnerConfirmStatus || "").toLowerCase() === "accepted"
  ) {
    return "confirmed";
  }
  return "requested";
}

export function pharmacyDeskTab(order) {
  const key = pharmacyTrackKey(order);
  return PHARMACY_DESK_TABS.find((tab) => tab.keys.includes(key))?.id || "new";
}

export function jobsForPharmacyDeskTab(jobs, tabId) {
  const wanted = String(tabId || "new");
  return (Array.isArray(jobs) ? jobs : []).filter((row) => pharmacyDeskTab(row) === wanted);
}

export function pharmacyStepState(order) {
  const current = pharmacyTrackKey(order);
  const orderKeys = PHARMACY_TRACK_STEPS.map((row) => row.key);
  const currentIndex = orderKeys.indexOf(current);
  return Object.fromEntries(
    orderKeys.map((key, index) => [
      key,
      current === "declined" ? key === "requested" : currentIndex >= 0 && index <= currentIndex,
    ])
  );
}

export function nextPharmacyStep(key) {
  const orderKeys = PHARMACY_TRACK_STEPS.map((row) => row.key);
  const index = orderKeys.indexOf(String(key || ""));
  if (key === "done" || key === "declined" || index < 0) return key === "declined" ? "declined" : "done";
  return orderKeys[Math.min(index + 1, orderKeys.length - 1)];
}

export function pharmacyPlacedFields(extras = {}) {
  return {
    trackStatus: "requested",
    status: "Order placed",
    partnerConfirmed: false,
    partnerConfirmStatus: "pending",
    availabilityChecked: Boolean(extras.availabilityChecked),
    availabilityCheckedAt: extras.availabilityCheckedAt || Date.now(),
    availabilityMessage:
      extras.availabilityMessage ||
      "Sent to the PIN pharmacy. Confirmed after they review the prescription.",
  };
}

export function pharmacyApprovedFields(now = Date.now()) {
  return {
    trackStatus: "confirmed",
    status: "Approved by pharmacist",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
    partnerConfirmedAt: now,
  };
}

export function pharmacyPackedFields(now = Date.now()) {
  return {
    trackStatus: "packed",
    status: "Packed",
    checkPackAt: now,
    qrPackedAt: now,
    qrLastScan: "pack",
  };
}

export function pharmacyPickedUpFields(now = Date.now()) {
  return {
    trackStatus: "on_the_way",
    status: "On the way",
    checkPickupAt: now,
    qrPickedAt: now,
    qrLastScan: "pickup",
    trackStartedAt: now,
    trackCompleted: false,
  };
}

export function pharmacyDeliveredFields(now = Date.now()) {
  return {
    trackStatus: "done",
    status: "Delivered",
    checkDeliverAt: now,
    qrReceivedAt: now,
    qrLastScan: "deliver",
    trackCompleted: true,
  };
}

export function canMarkPharmacyPacked(order) {
  return isPharmacyOrder(order) && pharmacyTrackKey(order) === "confirmed";
}

export function isPharmacyPackedChecked(order) {
  if (!order) return false;
  const key = pharmacyTrackKey(order);
  return (
    key === "packed" ||
    key === "picked_up" ||
    key === "on_the_way" ||
    key === "done" ||
    key === "return_requested" ||
    key === "returned"
  );
}

export function canMarkPharmacyReturn(order) {
  return isPharmacyOrder(order) && pharmacyTrackKey(order) === "done";
}

export function isReturnPhoto(value) {
  return /^data:image\//i.test(String(value || "").trim());
}

export function pharmacyReturnRequestedFields(now = Date.now(), extras = {}) {
  const photo = extras.photo || extras;
  return {
    returnStatus: "requested",
    returnRequestedAt: now,
    returnReason: String(extras.reason || "").trim().slice(0, 240),
    returnCustomerPhoto: String(photo.fileData || photo.returnCustomerPhoto || ""),
    returnCustomerPhotoName: String(photo.fileName || photo.returnCustomerPhotoName || "return.jpg"),
    returnCustomerPhotoType: String(photo.fileType || photo.returnCustomerPhotoType || "image/jpeg"),
    status: "Return requested",
  };
}

export function pharmacyReturnCollectedFields(now = Date.now(), extras = {}) {
  const photo = extras.photo || extras;
  return {
    returnStatus: "collected",
    returnCollectedAt: now,
    returnCollectPhoto: String(photo.fileData || photo.returnCollectPhoto || ""),
    returnCollectPhotoName: String(photo.fileName || photo.returnCollectPhotoName || "return-collect.jpg"),
    returnCollectPhotoType: String(photo.fileType || photo.returnCollectPhotoType || "image/jpeg"),
    status: "Return collected",
  };
}

export function pharmacyReturnReceivedFields(now = Date.now(), extras = {}) {
  return {
    returnStatus: "received",
    returnReceivedAt: now,
    refundStatus: extras.refundStatus || "pending",
    refundAmount: extras.refundAmount,
    refundUpdatedAt: now,
    status: "Refund pending",
  };
}

export function canCollectPharmacyReturn(order) {
  return isPharmacyOrder(order) && pharmacyReturnKey(order) === "return_requested";
}

export function canReceivePharmacyReturn(order) {
  return isPharmacyOrder(order) && pharmacyReturnKey(order) === "return_collected";
}

export function returnRequestError(fields) {
  if (!isReturnPhoto(fields?.returnCustomerPhoto)) {
    return "Upload a photo of the medicine to request a return.";
  }
  return "";
}

export function returnCollectError(fields) {
  if (!isReturnPhoto(fields?.returnCollectPhoto)) {
    return "Capture a photo while collecting the return medicine.";
  }
  return "";
}
