import { catalogLabIdForPartner } from "./commonLabPanel.js";

export const DEFAULT_SLOT_CAPACITY = 3;

export function diagnosticLabId(order = {}) {
  return String(
    order.preferredLabId || order.labId || order.tests?.[0]?.partnerId || order.partnerId || ""
  ).trim();
}

export function bookingOccupiesSlot(order = {}) {
  const kind = String(order.kind || order.orderType || order.serviceType || "").toLowerCase();
  if (kind !== "lab" && kind !== "radiology") return false;
  const status = String(order.trackStatus || "").toLowerCase();
  if (status === "cancelled" || status === "declined") return false;
  return Boolean(String(order.date || order.visitDate || "").slice(0, 10) && String(order.timeSlot || "").trim());
}

export function collectorCapacity(partners = [], labId = "") {
  const wanted = String(labId || "").trim();
  const matching = (partners || []).filter((partner) => {
    if (!wanted) return false;
    if (partner.id === wanted) return true;
    return catalogLabIdForPartner(partner) === wanted;
  });
  if (!matching.length) return DEFAULT_SLOT_CAPACITY;
  const people = matching.reduce((count, partner) => {
    const team = Array.isArray(partner.team) ? partner.team : [];
    const approved = team.filter((member) => String(member.status || "approved") !== "rejected");
    return count + Math.max(1, approved.length);
  }, 0);
  return Math.max(1, people);
}

export function slotRemaining(orders = [], { labId = "", date = "", slot = "", kind = "lab", excludeId = "", capacity = DEFAULT_SLOT_CAPACITY } = {}) {
  const day = String(date || "").slice(0, 10);
  const time = String(slot || "").trim();
  const centre = String(labId || "").trim();
  const service = String(kind || "lab").toLowerCase();
  if (!day || !time || !centre) return Number(capacity) || 0;
  const skip = String(excludeId || "");
  const used = (orders || []).filter((order) => {
    if (!bookingOccupiesSlot(order)) return false;
    const id = String(order.id || order.bookingId || order.requestId || "");
    if (skip && id === skip) return false;
    const orderKind = String(order.kind || order.orderType || order.serviceType || "").toLowerCase();
    if (orderKind !== service) return false;
    if (diagnosticLabId(order) !== centre) return false;
    if (String(order.date || order.visitDate || "").slice(0, 10) !== day) return false;
    return String(order.timeSlot || "").trim() === time;
  }).length;
  return Math.max(0, Number(capacity) - used);
}
