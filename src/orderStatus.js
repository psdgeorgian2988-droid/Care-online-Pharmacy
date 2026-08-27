export const SERVICE_ORDER_KINDS = [
  "medicine",
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "psychologist",
  "stepdown",
  "ambulance",
];

export const TRACK_STATUS_STEPS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "assigned", label: "Partner Assigned" },
  { key: "packed", label: "Packed" },
  { key: "on_the_way", label: "On The Way" },
  { key: "arriving", label: "Arriving" },
  { key: "done", label: "Done" },
];

export function serviceKind(order) {
  return String(order?.kind || order?.orderType || "medicine");
}

export function trackKey(order) {
  if (order?.trackCompleted) return "done";
  const key = String(order?.trackStatus || "confirmed");
  return TRACK_STATUS_STEPS.some((step) => step.key === key) ? key : "confirmed";
}

export function isOpenOrder(order) {
  return trackKey(order) !== "done";
}

export function isUnassigned(order) {
  return isOpenOrder(order) && !order?.partnerId;
}

export function nextTrackStep(key) {
  const index = TRACK_STATUS_STEPS.findIndex((step) => step.key === key);
  if (index < 0) return "assigned";
  return TRACK_STATUS_STEPS[Math.min(index + 1, TRACK_STATUS_STEPS.length - 1)].key;
}

export function emptyStepCounts() {
  return Object.fromEntries(TRACK_STATUS_STEPS.map((step) => [step.key, 0]));
}

export function statusMatrix(orders) {
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

  for (const order of orders) {
    const kind = serviceKind(order);
    const step = trackKey(order);
    if (!byKind[kind]) {
      byKind[kind] = { kind, ...emptyStepCounts(), open: 0, unassigned: 0, total: 0 };
    }
    byKind[kind][step] += 1;
    byKind[kind].total += 1;
    byStep[step] += 1;
    if (step === "done") {
      done += 1;
    } else {
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
    total: orders.length,
    inProgress: orders.filter((order) => {
      const step = trackKey(order);
      return step !== "confirmed" && step !== "done";
    }).length,
  };
}

export function groupByTrackStatus(orders) {
  const groups = Object.fromEntries(TRACK_STATUS_STEPS.map((step) => [step.key, []]));
  for (const order of orders) {
    groups[trackKey(order)].push(order);
  }
  return groups;
}

export function matchesStatusFilter(order, statusFilter) {
  if (!statusFilter || statusFilter === "all") return true;
  if (statusFilter === "open") return isOpenOrder(order);
  if (statusFilter === "unassigned") return isUnassigned(order);
  if (statusFilter === "progress") {
    const key = trackKey(order);
    return key !== "confirmed" && key !== "done";
  }
  return trackKey(order) === statusFilter;
}
