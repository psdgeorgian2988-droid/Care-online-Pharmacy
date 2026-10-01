import { ADMIN_SERVICE_TABS } from "./orderStatus.js";

export const PARTNER_CATEGORY_TABS = ADMIN_SERVICE_TABS.filter(
  (tab) => tab.value !== "all" && tab.value !== "refund"
);

/** Add-partner never asks for a split. Staff change it later with Update split. */
export function partnerCreateShowsSplit() {
  return false;
}

/** Partner-record split is for every category except lab, which is set per test. */
export function partnerUpdateShowsSplit(kind) {
  return String(kind || "").toLowerCase() !== "lab";
}

export function partnerPrimaryKind(partner) {
  const kinds = Array.isArray(partner?.kinds) ? partner.kinds : [];
  const first = String(kinds[0] || "").toLowerCase();
  return PARTNER_CATEGORY_TABS.some((tab) => tab.value === first) ? first : "medicine";
}

export function partnerInCategory(partner, category) {
  const key = String(category || "").toLowerCase();
  const kinds = Array.isArray(partner?.kinds)
    ? partner.kinds.map((kind) => String(kind || "").toLowerCase())
    : [];
  if (!key) return true;
  return kinds.includes(key) || partnerPrimaryKind(partner) === key;
}

export function partnersInCategory(partners, category) {
  return (Array.isArray(partners) ? partners : []).filter((partner) =>
    partnerInCategory(partner, category)
  );
}

export function countPartnersInCategory(partners, category) {
  return partnersInCategory(partners, category).length;
}

export function partnerCategoryLabel(kind) {
  const tab = PARTNER_CATEGORY_TABS.find((row) => row.value === kind);
  return tab?.label || String(kind || "Partner");
}

export function normalizePartnerPin(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

export function partnerCreateLocation(body = {}) {
  const address = String(body.address || "").replace(/\s+/g, " ").trim();
  const pin = normalizePartnerPin(body.pin || body.pinCode || body.pins?.[0]);
  if (!address) return { ok: false, error: "Address is required." };
  if (pin.length !== 6) return { ok: false, error: "A 6-digit PIN is required." };
  return { ok: true, address, pin, pins: [pin] };
}

export function partnerServicePins(partner) {
  const pins = Array.isArray(partner?.pins)
    ? partner.pins.map((pin) => normalizePartnerPin(pin)).filter((pin) => pin.length === 6)
    : [];
  const single = normalizePartnerPin(partner?.pin || partner?.pinCode);
  if (single.length === 6 && !pins.includes(single)) pins.unshift(single);
  return pins;
}
