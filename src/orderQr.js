import { SITE } from "./siteMeta.js";

export const CHECKPOINT_STEPS = [
  {
    key: "pack",
    label: "Order QR",
    hint: "The same QR is created when the order is placed.",
  },
  {
    key: "pickup",
    label: "Pickup",
    hint: "Pickup partner scans the retailer or service-provider QR to take the goods.",
  },
  {
    key: "deliver",
    label: "Delivery",
    hint: "Delivery partner scans the customer QR to complete handover.",
  },
];

export function orderIdOf(order) {
  return String(order?.id || order?.bookingId || order?.requestId || "").trim();
}

export function expectedItems(order) {
  const rows = [];
  const push = (name, qty = 1, extra = "") => {
    const label = String(name || "").trim();
    if (!label) return;
    const count = Number(qty);
    rows.push({
      name: label,
      qty: Number.isFinite(count) && count > 0 ? count : 1,
      extra: String(extra || "").trim(),
    });
  };

  if (Array.isArray(order?.items) && order.items.length) {
    for (const item of order.items) {
      if (typeof item === "string") {
        push(item, 1);
        continue;
      }
      push(
        item?.name || item?.title || item?.testName || item?.label || item?.medicine,
        item?.qty ?? item?.quantity ?? item?.strips ?? 1,
        item?.strength || item?.pack || item?.dose || ""
      );
    }
  } else if (Array.isArray(order?.tests) && order.tests.length) {
    for (const test of order.tests) {
      if (typeof test === "string") push(test, 1);
      else push(test?.name || test?.testName || test?.label, 1);
    }
  } else {
    const label = [
      order?.serviceLabel,
      order?.carePlanLabel,
      order?.planTitle,
      order?.serviceName,
    ]
      .filter(Boolean)
      .join(" · ");
    if (label) push(label, 1);
    else if (order?.emergencyType) {
      push(
        order.emergencyType === "emergency"
          ? "Emergency ambulance"
          : "Non-emergency ambulance",
        1
      );
    }
  }
  return rows;
}

export function contentsFingerprint(order) {
  return expectedItems(order)
    .map((row) => `${row.name.toLowerCase()}×${row.qty}`)
    .sort()
    .join("|");
}

function shortHash(text) {
  let hash = 2166136261;
  const value = String(text || "");
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function contentsSig(order) {
  const fingerprint = contentsFingerprint(order);
  return fingerprint ? shortHash(fingerprint) : "";
}

function otpFrom(id, salt) {
  const n = parseInt(shortHash(`${id || "medihome"}:${salt}`).slice(0, 6), 16) % 9000;
  return String(1000 + n);
}

export function ensureOrderCodes(order, now = Date.now()) {
  const id = orderIdOf(order);
  const pickupOtp = String(order?.pickupOtp || otpFrom(id, "pickup"));
  let deliverOtp = String(order?.deliverOtp || otpFrom(id, "deliver"));
  if (deliverOtp === pickupOtp) deliverOtp = otpFrom(id, "deliver-b");
  return {
    qrIssuedAt: order?.qrIssuedAt || now,
    pickupOtp,
    deliverOtp,
  };
}

export function otpForStep(order, step) {
  const checkpoint = normalizeScanStep(step) || nextQrScanAction(order);
  if (checkpoint === "pickup" || checkpoint === "pack") {
    return String(order?.pickupOtp || ensureOrderCodes(order).pickupOtp);
  }
  return String(order?.deliverOtp || ensureOrderCodes(order).deliverOtp);
}

export function verifyCheckpointOtp(order, step, code) {
  const expected = otpForStep(order, step);
  const given = String(code || "").replace(/\D/g, "");
  if (!expected || given.length !== 4) return { ok: false, reason: "otp" };
  return { ok: given === expected, reason: given === expected ? "" : "otp" };
}

export function normalizeScanStep(value) {
  const step = String(value || "").toLowerCase();
  if (step === "pack" || step === "packing") return "pack";
  if (step === "pickup" || step === "pick") return "pickup";
  if (step === "deliver" || step === "delivery" || step === "receive") return "deliver";
  return "";
}

export function scanHref({ id, step, order } = {}) {
  const params = new URLSearchParams();
  const value = String(id || orderIdOf(order) || "").trim();
  if (value) params.set("id", value);
  const checkpoint = normalizeScanStep(step);
  if (checkpoint) params.set("step", checkpoint);
  const sig = order ? contentsSig(order) : "";
  if (sig) params.set("c", sig);
  const query = params.toString();
  return query ? `#scan?${query}` : "#scan";
}

export function orderQrPath(id, order) {
  return scanHref({ id, order });
}

function homeCareScanKind(serviceType) {
  const type = String(serviceType || "").toLowerCase();
  if (type === "nurse") return "nurse";
  if (type === "physiotherapy" || type === "physio") return "physio";
  if (type === "caregiver") return "caregiver";
  return "homecare";
}

export function scanStepTitle(kind, step, serviceType) {
  const checkpoint = normalizeScanStep(step) || step;
  const service = String(kind || "medicine");
  const home = homeCareScanKind(serviceType);
  if (checkpoint === "pack") {
    return service === "medicine" ? "Scan Packing" : "Scan Service Prep";
  }
  if (checkpoint === "pickup") {
    if (service === "homecare" && home === "nurse") return "Scan Nurse Visit Start";
    if (service === "homecare" && home === "physio") return "Scan Physio Visit Start";
    if (service === "homecare") return "Scan Care Visit Start";
    if (service === "vaccination") return "Scan Vaccination Visit Start";
    if (service === "psychologist") return "Scan Session Start";
    if (service === "lab") return "Scan Collection Start";
    if (service === "radiology") return "Scan Centre Check-In";
    if (service === "ambulance") return "Scan Ambulance Pickup";
    if (service === "stepdown") return "Scan Centre Pickup";
    return "Scan Pickup";
  }
  if (service === "homecare" && home === "nurse") return "Scan Nursing Complete";
  if (service === "homecare" && home === "physio") return "Scan Physio Complete";
  if (service === "homecare") return "Scan Care Visit Complete";
  if (service === "vaccination") return "Scan Vaccination Visit Complete";
  if (service === "psychologist") return "Scan Consultation Complete";
  if (service === "lab") return "Scan Sample Received";
  if (service === "radiology") return "Scan Imaging Complete";
  if (service === "ambulance") return "Scan Handover";
  if (service === "stepdown") return "Scan Admission";
  return "Scan Delivery";
}

export function scanStepHint(kind, step, serviceType) {
  const checkpoint = normalizeScanStep(step) || step;
  const service = String(kind || "medicine");
  const title = scanStepTitle(kind, checkpoint, serviceType);
  if (checkpoint === "pack") {
    return `${title}: the same QR is created when the order is placed and shown to the retailer or service provider.`;
  }
  if (checkpoint === "pickup") {
    if (service === "radiology") {
      return `${title}: scan this QR at the assigned imaging centre before your test starts. If the QR cannot be scanned, enter the check-in OTP.`;
    }
    if (service === "homecare") {
      return `${title}: scan when the home-care partner arrives and starts the visit. If the QR cannot be scanned, enter the visit OTP.`;
    }
    if (service === "lab") {
      return `${title}: the collection partner scans this QR when the sample is taken. If the QR cannot be scanned, enter the collection OTP.`;
    }
    return `${title}: the pickup partner scans the retailer or service-provider QR to take the goods. If that QR cannot be scanned, enter the pickup OTP.`;
  }
  if (service === "radiology") {
    return `${title}: scan after the imaging study is finished. If the QR cannot be scanned, enter the completion OTP.`;
  }
  if (service === "homecare") {
    return `${title}: scan when the home visit is finished. If the QR cannot be scanned, enter the completion OTP.`;
  }
  if (service === "lab") {
    return `${title}: scan when the collected sample has been received. If the QR cannot be scanned, enter the receipt OTP.`;
  }
  return `${title}: the delivery partner scans the customer's QR to complete handover. If that QR cannot be scanned, enter the delivery OTP.`;
}

export function scanPageHeading(step, kind, serviceType) {
  const checkpoint = normalizeScanStep(step);
  if (!checkpoint) return "Scan Order QR";
  return scanStepTitle(kind, checkpoint, serviceType);
}

export function isMedicineOrder(order) {
  return orderServiceKind(order) === "medicine";
}

export function orderServiceKind(order) {
  const kind = String(order?.kind || order?.orderType || "").toLowerCase();
  if (
    kind === "lab" ||
    kind === "radiology" ||
    kind === "homecare" ||
    kind === "vaccination" ||
    kind === "psychologist" ||
    kind === "stepdown" ||
    kind === "ambulance" ||
    kind === "medicine"
  ) {
    return kind;
  }
  const service = String(order?.serviceType || "").toLowerCase();
  if (service === "radiology") return "radiology";
  if (service === "lab") return "lab";
  if (
    service === "nurse" ||
    service === "physiotherapy" ||
    service === "physio" ||
    service === "caregiver"
  ) {
    return "homecare";
  }
  return orderIdOf(order) ? "medicine" : "";
}

export function isMedicineRiderPartner(partner) {
  if (!partner || typeof partner !== "object") return false;
  const kinds = Array.isArray(partner.kinds) ? partner.kinds : [];
  const role = String(partner.role || "").toLowerCase();
  return kinds.includes("medicine") || role.includes("medicine") || /\brider\b/.test(role);
}

export function partnerServesKind(partner, kind) {
  const want = String(kind || "").toLowerCase();
  if (!want) return false;
  if (!partner || typeof partner !== "object") return true;
  const kinds = Array.isArray(partner.kinds)
    ? partner.kinds.map((row) => String(row || "").toLowerCase())
    : [];
  if (kinds.includes(want)) return true;
  const role = String(partner.role || "").toLowerCase();
  if (want === "medicine") return isMedicineRiderPartner(partner);
  if (want === "lab") {
    return role.includes("lab") || role.includes("phlebo") || role.includes("collection");
  }
  if (want === "homecare") {
    return (
      role.includes("homecare") ||
      role.includes("home care") ||
      role.includes("nurse") ||
      role.includes("physio") ||
      role.includes("caregiver")
    );
  }
  return false;
}

export function partnerUsesScanColumn(partner) {
  if (!partner) return false;
  return (
    isMedicineRiderPartner(partner) ||
    partnerServesKind(partner, "lab") ||
    partnerServesKind(partner, "homecare")
  );
}

export function hasAssignedCentre(order) {
  return [
    order?.partnerId,
    order?.partner,
    order?.outletName,
    order?.centreName,
    order?.imagingCentre,
  ].some((value) => String(value || "").trim());
}

function homeCareVisitActive(order) {
  const status = String(order?.trackStatus || "").toLowerCase();
  if (status === "on_the_way" || status === "arriving") return true;
  return Boolean(order?.checkPickupAt || order?.qrPickedAt);
}

export function scanActorFromSessions({ staffToken = "", partner = null } = {}) {
  if (String(staffToken || "").trim()) return "admin";
  if (partner && (partner.id || partner.role || (Array.isArray(partner.kinds) && partner.kinds.length))) {
    return "partner";
  }
  return "customer";
}

export function customerScanLink(order) {
  if (!orderIdOf(order)) return null;
  const kind = orderServiceKind(order);
  const next = nextQrScanAction(order);
  if (!kind || next === "already_done") return null;
  const serviceType = order?.serviceType;

  if (kind === "medicine") {
    if (next !== "deliver") return null;
    return { step: "deliver", label: scanStepTitle("medicine", "deliver") };
  }

  if (kind === "homecare") {
    if (!homeCareVisitActive(order)) return null;
    if (next !== "pickup" && next !== "deliver") return null;
    return { step: next, label: scanStepTitle("homecare", next, serviceType) };
  }

  if (kind === "lab") {
    if (next !== "deliver") return null;
    return { step: "deliver", label: scanStepTitle("lab", "deliver") };
  }

  if (kind === "radiology") {
    if (next !== "pickup" || !hasAssignedCentre(order)) return null;
    return { step: "pickup", label: scanStepTitle("radiology", "pickup") };
  }

  return null;
}

export function canShowCustomerScanDelivery(order) {
  return Boolean(customerScanLink(order));
}

export function partnerScanLink(order, partner) {
  if (!orderIdOf(order)) return null;
  const kind = orderServiceKind(order);
  const next = nextQrScanAction(order);
  if (!kind || next === "already_done") return null;
  const serviceType = order?.serviceType;

  if (kind === "medicine") {
    if (partner && !isMedicineRiderPartner(partner)) return null;
    if (next !== "pickup") return null;
    return { step: "pickup", label: "Scan Delivery" };
  }

  if (kind === "homecare") {
    if (partner && !partnerServesKind(partner, "homecare")) return null;
    if (!homeCareVisitActive(order)) return null;
    if (next !== "pickup" && next !== "deliver") return null;
    return { step: next, label: scanStepTitle("homecare", next, serviceType) };
  }

  if (kind === "lab") {
    if (partner && !partnerServesKind(partner, "lab")) return null;
    if (next !== "pickup") return null;
    return { step: "pickup", label: scanStepTitle("lab", "pickup") };
  }

  return null;
}

export function canShowRiderRetailerScan(order, partner) {
  const link = partnerScanLink(order, partner);
  return Boolean(link) && orderServiceKind(order) === "medicine" && link.step === "pickup";
}

export function canUseScanDelivery({ app = "customer", order, step, partner } = {}) {
  const checkpoint = normalizeScanStep(step);
  if (app === "admin") return true;
  const link =
    app === "partner" ? partnerScanLink(order, partner) : customerScanLink(order);
  if (!link) return false;
  return !checkpoint || checkpoint === link.step;
}

function adminScanLinks(order) {
  const kind = order && orderIdOf(order) ? orderServiceKind(order) || "medicine" : "medicine";
  const serviceType = order?.serviceType;
  return [
    { step: "pack", label: scanStepTitle(kind, "pack", serviceType) },
    { step: "pickup", label: scanStepTitle(kind, "pickup", serviceType) },
    { step: "deliver", label: scanStepTitle(kind, "deliver", serviceType) },
  ];
}

export function scanLinksForApp(app, order, partner) {
  if (app === "admin") return adminScanLinks(order);
  if (app === "partner") {
    if (!order) {
      if (partner && !partnerUsesScanColumn(partner)) return [];
      return [{ step: "pickup", label: "Scan Delivery" }];
    }
    const link = partnerScanLink(order, partner);
    return link ? [link] : [];
  }
  const link = customerScanLink(order);
  return link ? [link] : [];
}

export function trackQrPath(id) {
  const value = String(id || "").trim();
  return `#track?id=${encodeURIComponent(value)}`;
}

export function orderQrUrl(id, order) {
  const path = orderQrPath(id, order);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${window.location.pathname}${path}`;
}

function decodeSafe(value) {
  try {
    return decodeURIComponent(String(value || "")).trim();
  } catch {
    return String(value || "").trim();
  }
}

function paramsFromText(text) {
  const hashIndex = text.indexOf("#");
  if (hashIndex >= 0) {
    const hash = text.slice(hashIndex + 1);
    const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    return new URLSearchParams(query);
  }
  try {
    return new URL(text, `${SITE.url}/`).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function parseOrderQrMeta(raw) {
  const text = String(raw || "").trim();
  if (!text) return { id: "", contents: "" };

  const tagged = text.match(/^MHQR[:\s#-]+(.+)$/i);
  if (tagged) return { id: decodeSafe(tagged[1].trim()), contents: "" };

  const params = paramsFromText(text);
  const fromParams = params.get("id");
  if (fromParams) {
    return {
      id: decodeSafe(fromParams),
      contents: decodeSafe(params.get("c") || ""),
    };
  }

  if (/^[A-Za-z0-9._:-]{4,80}$/.test(text)) return { id: text, contents: "" };
  return { id: "", contents: "" };
}

export function parseOrderQr(raw) {
  return parseOrderQrMeta(raw).id;
}

export function qrMatchesOrder(order, scannedId, scannedSig) {
  const id = orderIdOf(order);
  if (scannedId && id && String(scannedId) !== id) {
    return { ok: false, reason: "qr_id" };
  }
  const liveSig = contentsSig(order);
  if (scannedSig && liveSig && scannedSig !== liveSig) {
    return { ok: false, reason: "contents" };
  }
  return { ok: true, reason: "" };
}

export function checkpointState(order) {
  if (
    order?.trackCompleted &&
    !order?.lastMismatchAt &&
    !order?.checkPickupAt &&
    !order?.checkDeliverAt
  ) {
    return { pack: true, pickup: true, deliver: true };
  }
  const pickup = Boolean(order?.checkPickupAt || order?.qrPickedAt);
  const deliver = Boolean(
    order?.checkDeliverAt ||
      order?.qrReceivedAt ||
      (order?.trackCompleted && pickup)
  );
  const pack = Boolean(
    order?.qrIssuedAt ||
      order?.pickupOtp ||
      order?.checkPackAt ||
      order?.qrPackedAt ||
      pickup ||
      deliver ||
      orderIdOf(order)
  );
  return {
    pack,
    pickup: pickup || deliver,
    deliver,
  };
}

export function nextQrScanAction(order) {
  const checks = checkpointState(order);
  if (checks.deliver || order?.trackCompleted) return "already_done";
  if (!checks.pickup) return "pickup";
  return "deliver";
}

function doneStatus(kind) {
  return kind === "medicine" ? "Delivered" : "Completed";
}

export function qrScanPatch(order, now = Date.now()) {
  const action = nextQrScanAction(order);
  const kind = String(order?.kind || order?.orderType || "medicine");
  if (action === "already_done") {
    return { action, patch: {} };
  }
  if (action === "pickup") {
    return {
      action,
      patch: {
        checkPackAt: order?.checkPackAt || order?.qrPackedAt || now,
        checkPickupAt: now,
        qrPickedAt: now,
        qrLastScan: "pickup",
        lastMismatchStage: "",
        trackStatus: "on_the_way",
        trackCompleted: false,
        trackStartedAt: now,
        status: "On The Way",
      },
    };
  }
  return {
    action: "deliver",
    patch: {
      checkPackAt: order?.checkPackAt || order?.qrPackedAt || now,
      checkPickupAt: order?.checkPickupAt || order?.qrPickedAt || now,
      checkDeliverAt: now,
      qrReceivedAt: now,
      qrLastScan: "deliver",
      lastMismatchStage: "",
      trackStatus: "done",
      trackCompleted: true,
      status: doneStatus(kind),
      partnerLat: order?.destLat ?? order?.partnerLat,
      partnerLng: order?.destLng ?? order?.partnerLng,
    },
  };
}

export function mismatchRedeliveryPatch(order, stage, now = Date.now()) {
  const actionStage = stage || nextQrScanAction(order);
  const count = Number(order?.redeliveryCount || 0) + 1;
  const history = Array.isArray(order?.redeliveryHistory)
    ? order.redeliveryHistory
    : [];
  return {
    action: "mismatch",
    patch: {
      lastMismatchStage: actionStage,
      lastMismatchAt: now,
      redeliveryCount: count,
      redeliveryHistory: [
        ...history,
        {
          at: now,
          stage: actionStage,
          items: expectedItems(order).map((row) => row.name),
        },
      ].slice(-12),
      checkPackAt: null,
      checkPickupAt: null,
      checkDeliverAt: null,
      qrPackedAt: null,
      qrPickedAt: null,
      qrReceivedAt: null,
      qrLastScan: "mismatch",
      ...ensureOrderCodes({ ...order, pickupOtp: "", deliverOtp: "", qrIssuedAt: null }, now),
      trackCompleted: false,
      trackStatus: "confirmed",
      trackStartedAt: null,
      partnerLat: order?.startLat ?? order?.partnerLat,
      partnerLng: order?.startLng ?? order?.partnerLng,
      status: "Redelivery — Pack Correct Items",
    },
  };
}

export function checkpointsForManualStatus(trackStatus, now = Date.now()) {
  if (trackStatus === "done") {
    return {
      checkPackAt: now,
      checkPickupAt: now,
      checkDeliverAt: now,
      qrLastScan: "deliver",
    };
  }
  if (trackStatus === "on_the_way" || trackStatus === "arriving") {
    return {
      checkPackAt: now,
      checkPickupAt: now,
      checkDeliverAt: null,
      qrLastScan: "pickup",
      trackCompleted: false,
    };
  }
  if (trackStatus === "packed") {
    return {
      checkPackAt: now,
      checkPickupAt: null,
      checkDeliverAt: null,
      qrLastScan: "pack",
      trackCompleted: false,
    };
  }
  return {};
}

export function scanActionLabel(action) {
  if (action === "pack") return "Packed — Matches Order";
  if (action === "pickup") return "Picked Up — Matches Order";
  if (action === "deliver") return "Delivered — Matches Order";
  if (action === "mismatch") return "Mismatch — Delivery Stopped";
  if (action === "already_done") return "Already Completed";
  if (action === "review") return "Check Against Order";
  return "Scanned";
}

export function checkpointLabel(key, kind = "") {
  const service = String(kind || "").toLowerCase();
  if (service === "radiology") {
    if (key === "pack") return "Booking QR";
    if (key === "pickup") return "Check-In";
    if (key === "deliver") return "Imaging Complete";
  }
  if (service === "homecare") {
    if (key === "pack") return "Visit QR";
    if (key === "pickup") return "Visit Start";
    if (key === "deliver") return "Visit Complete";
  }
  if (service === "lab") {
    if (key === "pack") return "Booking QR";
    if (key === "pickup") return "Collection";
    if (key === "deliver") return "Sample Received";
  }
  return CHECKPOINT_STEPS.find((step) => step.key === key)?.label || "Checkpoint";
}

export function gatedTrackStatus(order, progressKey = "") {
  const checks = checkpointState(order);
  if (checks.deliver || order?.trackCompleted) return "done";
  if (checks.pickup) {
    if (progressKey === "done") return "arriving";
    if (
      !progressKey ||
      progressKey === "confirmed" ||
      progressKey === "assigned" ||
      progressKey === "packed"
    ) {
      return "on_the_way";
    }
    return progressKey;
  }
  if (
    order?.partnerId ||
    order?.trackStatus === "assigned" ||
    progressKey === "assigned"
  ) {
    return "assigned";
  }
  return "confirmed";
}
