import { isDeliveryPartner } from "./partnerRetention.js";
import { PHARMACY_DESK_TABS, pharmacyDeskTab, pharmacyTrackKey } from "./pharmacyTrack.js";

const GENERIC_VISIT_TABS = [
  { id: "new", label: "New orders", keys: ["requested", "declined"] },
  { id: "approved", label: "Approved", keys: ["confirmed"] },
  { id: "assigned", label: "Assigned", keys: ["assigned"] },
  { id: "progress", label: "On the way", keys: ["on_the_way", "arriving", "packed"] },
  { id: "done", label: "Completed", keys: ["done"] },
];

export const PARTNER_DESK_TABS = {
  medicine: PHARMACY_DESK_TABS,
  lab: [
    { id: "new", label: "New orders", keys: ["requested", "slot_offered", "declined"] },
    { id: "approved", label: "Approved", keys: ["confirmed"] },
    { id: "assigned", label: "Assigned", keys: ["assigned"] },
    { id: "sample", label: "Sample collected", keys: ["sample_collected"] },
    { id: "reports", label: "Report ready", keys: ["report_ready"] },
    { id: "done", label: "Completed", keys: ["done"] },
  ],
  radiology: [
    { id: "new", label: "New orders", keys: ["requested", "slot_offered", "declined"] },
    { id: "approved", label: "Approved", keys: ["confirmed"] },
    { id: "assigned", label: "Assigned", keys: ["assigned"] },
    { id: "reports", label: "Report ready", keys: ["report_ready"] },
    { id: "done", label: "Completed", keys: ["done"] },
  ],
  homecare: GENERIC_VISIT_TABS,
  vaccination: GENERIC_VISIT_TABS,
  psychologist: [
    { id: "new", label: "New orders", keys: ["requested", "slot_offered", "declined"] },
    { id: "approved", label: "Approved", keys: ["confirmed"] },
    { id: "assigned", label: "Assigned", keys: ["assigned"] },
    { id: "done", label: "Completed", keys: ["done"] },
  ],
  ambulance: [
    { id: "new", label: "New orders", keys: ["requested", "declined"] },
    { id: "assigned", label: "Assigned", keys: ["confirmed", "assigned"] },
    { id: "progress", label: "On the way", keys: ["on_the_way", "arriving"] },
    { id: "done", label: "Completed", keys: ["done"] },
  ],
};

export function usesPartnerServiceDesk(kind, partner) {
  if (isDeliveryPartner(partner)) return false;
  const key = String(kind || "").toLowerCase();
  if (key === "doctor" || key === "delivery" || key === "stepdown") return false;
  return Boolean(PARTNER_DESK_TABS[key]);
}

export function partnerDeskTabsFor(kind) {
  return PARTNER_DESK_TABS[String(kind || "").toLowerCase()] || [];
}

export function partnerJobTrackKey(order, kind = "") {
  const appKind = String(kind || order?.kind || order?.orderType || "").toLowerCase();
  if (appKind === "medicine" || appKind === "cart") return pharmacyTrackKey(order);
  const status = String(order?.trackStatus || "").toLowerCase();
  if (status === "declined") return "declined";
  if (order?.trackCompleted || status === "done") return "done";
  if (status === "report_ready") return "report_ready";
  if (status === "sample_collected") return "sample_collected";
  if (status === "slot_offered") return "slot_offered";
  if (status === "on_the_way" || status === "arriving") return "on_the_way";
  if (status === "assigned") return "assigned";
  if (status === "confirmed") return "confirmed";
  if (
    order?.partnerConfirmed === true ||
    String(order?.partnerConfirmStatus || "").toLowerCase() === "accepted"
  ) {
    return status || "confirmed";
  }
  if (String(order?.partnerConfirmStatus || "").toLowerCase() === "slot_offered") {
    return "slot_offered";
  }
  return "requested";
}

export function partnerDeskTab(order, kind = "") {
  const appKind = String(kind || order?.kind || order?.orderType || "").toLowerCase();
  if (appKind === "medicine" || appKind === "cart") return pharmacyDeskTab(order);
  const key = partnerJobTrackKey(order, appKind);
  return partnerDeskTabsFor(appKind).find((tab) => tab.keys.includes(key))?.id || "new";
}

export function jobsForPartnerDeskTab(jobs, tabId, kind) {
  const wanted = String(tabId || "new");
  return (Array.isArray(jobs) ? jobs : []).filter((row) => partnerDeskTab(row, kind) === wanted);
}
