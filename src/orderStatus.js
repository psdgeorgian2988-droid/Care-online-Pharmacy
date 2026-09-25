import { isAwaitingPartnerConfirm } from "./orderConfirm.js";
import { isStepdownCancelled } from "./stepdownCancel.js";
import { stepdownStageLabel } from "./stepdownDesk.js";
import { diagnosticStepLabel, isDiagnosticKind } from "./labPipeline.js";
import {
  isPharmacyOrder,
  nextPharmacyStep,
  pharmacyStatusLabel,
  pharmacyTrackKey,
} from "./pharmacyTrack.js";

export const SERVICE_ORDER_KINDS = [
  "medicine",
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "psychologist",
  "doctor",
  "stepdown",
  "ambulance",
];

export const TRACK_STATUS_STEPS = [
  { key: "requested", label: "Awaiting Partner Confirmation" },
  { key: "confirmed", label: "Confirmed" },
  { key: "assigned", label: "Partner Assigned" },
  { key: "sample_collected", label: "Sample Collected" },
  { key: "report_ready", label: "Report Ready" },
  { key: "packed", label: "Packed" },
  { key: "picked_up", label: "Picked up" },
  { key: "on_the_way", label: "On The Way" },
  { key: "arriving", label: "Arriving" },
  { key: "done", label: "Done" },
  { key: "declined", label: "Declined" },
];

export function serviceKind(order) {
  const raw = String(order?.kind || order?.orderType || "medicine").toLowerCase();
  if (raw === "cart") return "medicine";
  return raw || "medicine";
}

export function serviceCategoryTitle(kind) {
  switch (String(kind || "").toLowerCase()) {
    case "medicine":
      return "Pharmacy orders";
    case "lab":
      return "Lab test orders";
    case "radiology":
      return "Radiology test orders";
    case "homecare":
      return "Home Care orders";
    case "vaccination":
      return "Vaccination orders";
    case "psychologist":
      return "Psychology orders";
    case "doctor":
      return "Doctor appointment orders";
    case "stepdown":
      return "Step-down orders";
    case "ambulance":
      return "Ambulance orders";
    default:
      return "Orders";
  }
}

export function groupOrdersByKind(orders, kinds = SERVICE_ORDER_KINDS) {
  const list = Array.isArray(orders) ? orders : [];
  return kinds.map((kind) => ({
    kind,
    title: serviceCategoryTitle(kind),
    orders: list.filter((order) => serviceKind(order) === kind),
  }));
}

export function trackKey(order) {
  if (isStepdownCancelled(order) || String(order?.trackStatus || "").toLowerCase() === "cancelled") {
    return "declined";
  }
  if (isPharmacyOrder(order)) return pharmacyTrackKey(order);
  if (order?.trackCompleted && String(order?.trackStatus || "") !== "declined") {
    return "done";
  }
  if (String(order?.trackStatus || "").toLowerCase() === "declined") {
    return "declined";
  }
  if (isAwaitingPartnerConfirm(order)) {
    return "requested";
  }
  const key = String(order?.trackStatus || "confirmed");
  return TRACK_STATUS_STEPS.some((step) => step.key === key) ? key : "confirmed";
}

export function isOpenOrder(order) {
  if (isStepdownCancelled(order)) return false;
  const key = trackKey(order);
  return key !== "done" && key !== "declined";
}

export function isUnassigned(order) {
  return isOpenOrder(order) && !order?.partnerId;
}

export function nextTrackStep(key, kind = "") {
  if (String(kind || "").toLowerCase() === "medicine") {
    return nextPharmacyStep(key);
  }
  if (key === "done" || key === "declined") return key;
  const index = TRACK_STATUS_STEPS.findIndex((step) => step.key === key);
  if (index < 0) return "assigned";
  const next = TRACK_STATUS_STEPS[Math.min(index + 1, TRACK_STATUS_STEPS.length - 1)].key;
  return next === "declined" ? "done" : next;
}

export function emptyStepCounts() {
  return Object.fromEntries(TRACK_STATUS_STEPS.map((step) => [step.key, 0]));
}

export function statusMatrix(orders) {
  const list = Array.isArray(orders) ? orders : [];
  const byKind = Object.fromEntries(
    SERVICE_ORDER_KINDS.map((kind) => [
      kind,
      { kind, ...emptyStepCounts(), open: 0, unassigned: 0, total: 0 },
    ])
  );
  const byStep = emptyStepCounts();
  let open = 0;
  let done = 0;
  let unassigned = 0;

  for (const order of list) {
    const kind = serviceKind(order);
    const step = trackKey(order);
    if (!byKind[kind]) {
      byKind[kind] = { kind, ...emptyStepCounts(), open: 0, unassigned: 0, total: 0 };
    }
    byKind[kind][step] = (byKind[kind][step] || 0) + 1;
    byKind[kind].total += 1;
    byStep[step] = (byStep[step] || 0) + 1;
    if (step === "done") {
      done += 1;
    } else if (step !== "declined") {
      open += 1;
      byKind[kind].open += 1;
      if (isUnassigned(order)) {
        unassigned += 1;
        byKind[kind].unassigned += 1;
      }
    }
  }

  return {
    byKind: SERVICE_ORDER_KINDS.map((kind) => byKind[kind]).concat(
      Object.values(byKind).filter((row) => !SERVICE_ORDER_KINDS.includes(row.kind))
    ),
    byStep,
    open,
    done,
    unassigned,
    total: list.length,
    inProgress: list.filter((order) => {
      const step = trackKey(order);
      return (
        step !== "requested" &&
        step !== "confirmed" &&
        step !== "done" &&
        step !== "declined"
      );
    }).length,
  };
}

export function groupByTrackStatus(orders) {
  const groups = Object.fromEntries(TRACK_STATUS_STEPS.map((step) => [step.key, []]));
  for (const order of orders || []) {
    const key = trackKey(order);
    if (!groups[key]) groups[key] = [];
    groups[key].push(order);
  }
  return groups;
}

export function matchesStatusFilter(order, statusFilter) {
  if (!statusFilter || statusFilter === "all") return true;
  if (statusFilter === "open") return isOpenOrder(order);
  if (statusFilter === "unassigned") return isUnassigned(order);
  if (statusFilter === "progress") {
    const key = trackKey(order);
    return (
      key !== "requested" &&
      key !== "confirmed" &&
      key !== "done" &&
      key !== "declined"
    );
  }
  return trackKey(order) === statusFilter;
}

export function statusLabel(key, kind = "") {
  if (String(kind || "").toLowerCase() === "medicine") {
    return pharmacyStatusLabel(key);
  }
  return TRACK_STATUS_STEPS.find((step) => step.key === key)?.label || key;
}

export function isGenericTrackLabel(value) {
  return /^(lab|imaging)\s+update$/i.test(String(value || "").trim());
}

export function orderCurrentStatus(order) {
  const kind = String(order?.kind || order?.orderType || "medicine").toLowerCase();
  if (kind === "stepdown") {
    if (isStepdownCancelled(order)) return "Cancelled";
    return stepdownStageLabel(order);
  }
  if (isPharmacyOrder(order) || kind === "medicine") {
    return pharmacyStatusLabel(pharmacyTrackKey(order));
  }
  const raw = String(order?.status || order?.trackLabel || "")
    .replace(/technician assigned/i, "Partner Assigned")
    .trim();
  if (raw && !isGenericTrackLabel(raw) && raw.toLowerCase() !== "current status") {
    return raw;
  }
  const key = String(order?.trackStatus || "").toLowerCase();
  const labeled = isDiagnosticKind(kind)
    ? diagnosticStepLabel(key, kind)
    : statusLabel(key, kind);
  if (
    labeled &&
    !isGenericTrackLabel(labeled) &&
    labeled.toLowerCase() !== "current status"
  ) {
    return labeled;
  }
  return "In progress";
}
