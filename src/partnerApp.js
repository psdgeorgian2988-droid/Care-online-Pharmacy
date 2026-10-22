import { isDeliveryPartner } from "./partnerRetention.js";

/** One partner login runs one partner app. First kind is the app. */
export const PARTNER_APP_KINDS = [
  "medicine",
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "psychologist",
  "doctor",
  "ambulance",
  "stepdown",
];

const DESK_BY_KIND = {
  medicine: "#pharmacy-desk",
  lab: "#lab-desk",
  radiology: "#radiology-desk",
  homecare: "#homecare-desk",
  vaccination: "#vaccination-desk",
  psychologist: "#psychologist-desk",
  doctor: "#doctor-desk",
  ambulance: "#ambulance-desk",
  stepdown: "#stepdown-desk",
};

const KIND_BY_DESK = {
  ...Object.fromEntries(Object.entries(DESK_BY_KIND).map(([kind, hash]) => [hash, kind])),
  "#delivery-desk": "medicine",
};

export function partnerAppKind(partner) {
  const kinds = Array.isArray(partner?.kinds) ? partner.kinds : [];
  const first = String(kinds[0] || "").toLowerCase().trim();
  return PARTNER_APP_KINDS.includes(first) ? first : "medicine";
}

/** The password from registration signs in on every desk this partner is approved for. */
export function partnerServesKind(partner, kind) {
  const wanted = String(kind || "").toLowerCase().trim();
  if (!wanted) return false;
  if (wanted === "medicine" && isDeliveryPartner(partner)) return true;
  const kinds = Array.isArray(partner?.kinds)
    ? partner.kinds.map((row) => String(row || "").toLowerCase().trim())
    : [];
  if (kinds.includes(wanted)) return true;
  return partnerAppKind(partner) === wanted;
}

export function partnerServesDesk(partner, deskKind) {
  return partnerServesKind(partner, deskKind);
}

export function partnerDeskHash(kind, partner) {
  if (isDeliveryPartner(partner)) return "#delivery-desk";
  return DESK_BY_KIND[String(kind || "").toLowerCase()] || "#partner-desk";
}

export function partnerDeskKindFromRoute(route) {
  return KIND_BY_DESK[String(route || "")] || "";
}

export function isPartnerDeskRoute(route) {
  const hash = String(route || "");
  return hash === "#partner-desk" || Boolean(KIND_BY_DESK[hash]);
}

export function partnerAppTitle(kind, partner, route) {
  if (isDeliveryPartner(partner) || String(route || "") === "#delivery-desk" || String(kind || "") === "delivery") {
    return "Delivery Partner";
  }
  switch (String(kind || "").toLowerCase()) {
    case "medicine":
      return "Pharmacy Partner";
    case "lab":
      return "Lab Partner";
    case "radiology":
      return "Radiology Partner";
    case "homecare":
      return "Home Care Partner";
    case "vaccination":
      return "Vaccination Partner";
    case "psychologist":
      return "Psychology Partner";
    case "doctor":
      return "Doctor Partner";
    case "ambulance":
      return "Ambulance Partner";
    case "stepdown":
      return "Step-down Partner";
    default:
      return "Partner";
  }
}

export function jobKindForPartnerApp(job) {
  const raw = String(job?.kind || job?.orderType || "medicine").toLowerCase();
  if (raw === "cart") return "medicine";
  return raw || "medicine";
}

export function jobsForPartnerApp(jobs, partner, deskKind = "") {
  const kind =
    deskKind && partnerServesKind(partner, deskKind)
      ? String(deskKind).toLowerCase()
      : partnerAppKind(partner);
  return (Array.isArray(jobs) ? jobs : []).filter(
    (row) => jobKindForPartnerApp(row) === kind
  );
}
