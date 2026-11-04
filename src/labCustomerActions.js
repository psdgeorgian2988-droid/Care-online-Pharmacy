import { isDiagnosticKind } from "./labPipeline.js";

const LOCKED = new Set([
  "sample_collected",
  "processing",
  "report_ready",
  "report_uploaded",
  "done",
  "cancelled",
  "declined",
]);

export function guestMobile(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

export function orderMobileDigits(order = {}) {
  return guestMobile(order.mobile || order.mobileNumber || order.patientMobile || order.phone);
}

export function canCustomerChangeLabBooking(order = {}) {
  const kind = String(order.kind || order.orderType || order.serviceType || "").toLowerCase();
  if (!isDiagnosticKind(kind)) return false;
  const status = String(order.trackStatus || "").toLowerCase();
  if (LOCKED.has(status)) return false;
  if (order.sampleCollectedAt) return false;
  return true;
}

export function customerCancelFields(now = Date.now()) {
  return {
    trackStatus: "cancelled",
    status: "Cancelled",
    cancelledAt: now,
    collectorLive: false,
    trackCompleted: true,
  };
}

export function customerRescheduleFields({ date, timeSlot } = {}, now = Date.now()) {
  return {
    date: String(date || "").slice(0, 10),
    timeSlot: String(timeSlot || "").trim().slice(0, 40),
    status: "Slot updated",
    rescheduledAt: now,
  };
}
