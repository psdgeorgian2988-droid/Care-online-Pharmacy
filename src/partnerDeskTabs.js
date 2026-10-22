import { labJobCanReceiveReport, orderHasReport } from "./labPipeline.js";
import { customerPaidAtCheckout } from "./paymentMethods.js";
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
    { id: "process", label: "Under process", keys: ["processing"] },
    { id: "ready", label: "Report ready", keys: ["report_ready"] },
    { id: "uploaded", label: "Report uploaded", keys: ["report_uploaded"] },
    { id: "done", label: "Order complete", keys: ["done"] },
  ],
  radiology: [
    { id: "new", label: "New orders", keys: ["requested", "slot_offered", "declined"] },
    { id: "approved", label: "Approved", keys: ["confirmed"] },
    { id: "assigned", label: "Assigned", keys: ["assigned"] },
    { id: "sample", label: "Sample collected", keys: ["sample_collected"] },
    { id: "process", label: "Under process", keys: ["processing"] },
    { id: "ready", label: "Report ready", keys: ["report_ready"] },
    { id: "uploaded", label: "Report uploaded", keys: ["report_uploaded"] },
    { id: "done", label: "Order complete", keys: ["done"] },
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
  if (appKind === "lab" || appKind === "radiology") {
    if (status === "done" && orderHasReport(order)) return "done";
    if (orderHasReport(order)) return "report_uploaded";
    if (status === "report_uploaded") return "report_ready";
    if (status === "report_ready") return "report_ready";
    if (status === "processing") return "processing";
    if (status === "sample_collected") return "sample_collected";
    if (status === "done" || order?.trackCompleted) {
      if (order?.reportReadyAt) return "report_ready";
      if (order?.processingAt) return "processing";
      if (order?.sampleCollectedAt) return "sample_collected";
      return "confirmed";
    }
  } else if (order?.trackCompleted || status === "done") return "done";
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
  const tabs = partnerDeskTabsFor(appKind);
  return tabs.find((tab) => tab.keys.includes(key))?.id || "new";
}

export function labDeskAllowsPaymentCollect(tabId) {
  const id = String(tabId || "")
    .toLowerCase()
    .replace(/-/g, "_");
  return id === "sample" || id === "sample_collected" || id === "collected";
}

export function partnerDeskNeedsPaymentCollect(job, { tabId, kind, paid } = {}) {
  const appKind = String(kind || job?.kind || job?.orderType || "").toLowerCase();
  if (appKind === "medicine" || appKind === "cart") return false;
  if (customerPaidAtCheckout(job, paid)) return false;
  if (appKind === "lab") return labDeskAllowsPaymentCollect(tabId);
  return true;
}

export function jobsForPartnerDeskTab(jobs, tabId, kind) {
  const wanted = String(tabId || "new");
  const list = Array.isArray(jobs) ? jobs : [];
  const appKind = String(kind || "").toLowerCase();
  if (appKind === "lab" && wanted === "ready") {
    return list.filter((row) => partnerJobTrackKey(row, "lab") === "report_ready");
  }
  if (appKind === "lab" && wanted === "sample") {
    return list.filter((row) => partnerJobTrackKey(row, "lab") === "sample_collected");
  }
  return list.filter((row) => partnerDeskTab(row, kind) === wanted);
}
