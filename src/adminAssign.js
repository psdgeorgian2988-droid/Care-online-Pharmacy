import { initialOrderStatus } from "./orderConfirm.js";
import { serviceKind } from "./orderStatus.js";

/** Staff/admin Order status only. Customer and partner screens never show assign. */
export function showStaffAssignPartner(audience) {
  const who = String(audience || "").toLowerCase();
  return who === "staff" || who === "admin";
}

export function isDeclinedPartnerOrder(order) {
  const confirm = String(order?.partnerConfirmStatus || "").toLowerCase();
  const track = String(order?.trackStatus || "").toLowerCase();
  return confirm === "declined" || track === "declined";
}

/** Unassigned, declined, or a partner who has not taken the job. */
export function staffNeedsPartnerAssign(order) {
  if (!order) return false;
  if (isDeclinedPartnerOrder(order)) return true;
  if (!String(order.partnerId || "").trim()) return true;
  const confirm = String(order.partnerConfirmStatus || "").toLowerCase();
  if (order.partnerConfirmed === true || confirm === "accepted" || confirm === "auto") {
    return false;
  }
  return true;
}

export function partnersForStaffAssign(partners, kind, currentPartnerId = "") {
  const key = String(kind || "").toLowerCase();
  const current = String(currentPartnerId || "");
  return (Array.isArray(partners) ? partners : []).filter((row) => {
    if (!row?.id) return false;
    if (current && String(row.id) === current) return true;
    const kinds = Array.isArray(row.kinds) ? row.kinds : [];
    if (!kinds.length) return true;
    return kinds.some((item) => String(item || "").toLowerCase() === key);
  });
}

/** PATCH body for handleAssign → patchStaffOrder. Reopens declined jobs. */
export function staffAssignPartnerPatch(order, partnerId) {
  const id = String(partnerId || "").trim();
  if (!id) return { partnerId: "" };
  const patch = { partnerId: id };
  if (!isDeclinedPartnerOrder(order)) return patch;
  return {
    ...patch,
    ...initialOrderStatus(serviceKind(order)),
    trackCompleted: false,
    partnerConfirmedAt: 0,
  };
}
