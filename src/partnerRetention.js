/** Pharmacy stores keep every order. Delivery partners keep completed jobs for 30 days. Admin keeps all forever. */
export const DELIVERY_RECORD_MS = 30 * 24 * 60 * 60 * 1000;

function roleText(partner) {
  return String(partner?.role || "").toLowerCase();
}

function partnerKinds(partner) {
  return Array.isArray(partner?.kinds) ? partner.kinds.map((row) => String(row || "").toLowerCase()) : [];
}

export function isPharmacyStorePartner(partner) {
  if (!partner) return false;
  const role = roleText(partner);
  const kinds = partnerKinds(partner);
  if (role.includes("rider") || role.includes("delivery")) return false;
  return (
    kinds.includes("medicine") ||
    role.includes("pharmacy") ||
    role.includes("pharmacist") ||
    role.includes("store") ||
    role.includes("retail")
  );
}

export function isDeliveryPartner(partner) {
  if (!partner || isPharmacyStorePartner(partner)) return false;
  const role = roleText(partner);
  const kinds = partnerKinds(partner);
  return (
    kinds.includes("medicine") &&
    (role.includes("rider") || role.includes("delivery") || role.includes("medicine"))
  );
}

export function isClosedDeliveryRecord(row) {
  const status = String(row?.trackStatus || "").toLowerCase();
  return status === "done" || status === "declined" || Boolean(row?.trackCompleted);
}

export function deliveryRecordKeptUntil(row) {
  const at = Number(
    row?.checkDeliverAt ||
      row?.qrReceivedAt ||
      row?.deliveredAt ||
      row?.updatedAt ||
      0
  );
  return at ? at + DELIVERY_RECORD_MS : 0;
}

export function deliveryRecordIsFresh(row, now = Date.now()) {
  if (!isClosedDeliveryRecord(row)) return true;
  const until = deliveryRecordKeptUntil(row);
  if (!until) return true;
  return now <= until;
}
