import {
  locationFromPinSync,
  normalizePin,
  pinLocationForDisplay,
  resolvePinLocation,
} from "./pinLocation";
import { publishOrder } from "./adminApi";
import { withDeliveryOutlet } from "./deliveryOutlets";

export const ORDER_STORAGE = {
  medicine: "mediHomeOrders",
  lab: "mediHomeDiagnosticsBookings",
  radiology: "mediHomeDiagnosticsBookings",
  homecare: "mediHomeHomeCareBookings",
  stepdown: "mediHomeStepDownBookings",
  ambulance: "mediHomeAmbulanceRequests",
};

export const TRACK_STEPS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "assigned", label: "Partner Assigned" },
  { key: "on_the_way", label: "On The Way" },
  { key: "arriving", label: "Arriving" },
  { key: "done", label: "Delivered" },
];

const DURATION_MS = {
  medicine: 150000,
  lab: 160000,
  radiology: 160000,
  homecare: 170000,
  stepdown: 180000,
  ambulance: 90000,
};

function readList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function hashSeed(value) {
  const text = String(value || "medihome");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function trackHref(id) {
  return `#track?id=${encodeURIComponent(String(id || ""))}`;
}

export function doneLabel(kind) {
  return kind === "medicine" ? "Delivered" : "Completed";
}

export function kindLabel(kind) {
  switch (kind) {
    case "lab":
      return "Laboratory Test";
    case "radiology":
      return "Radiology & Imaging";
    case "homecare":
      return "Home Care";
    case "stepdown":
      return "Step-Down Care";
    case "ambulance":
      return "Ambulance";
    default:
      return "Medicine Order";
  }
}

export function partnerRole(kind) {
  switch (kind) {
    case "ambulance":
      return "Ambulance driver";
    case "homecare":
      return "Home Care professional";
    case "stepdown":
      return "Admission coordinator";
    case "lab":
      return "Sample collection executive";
    case "radiology":
      return "Centre coordinator";
    default:
      return "Delivery agent";
  }
}

const AGENT_ROSTER = {
  medicine: [
    { name: "Amit Kumar", mobile: "9810045123", vehicle: "DL 8C AB 2194" },
    { name: "Sandeep Yadav", mobile: "9811178340", vehicle: "DL 3S EF 6621" },
    { name: "Neeraj Verma", mobile: "9871112045", vehicle: "HR 26 DK 4488" },
    { name: "Pooja Nair", mobile: "9999102267", vehicle: "DL 4C PN 1093" },
  ],
  ambulance: [
    { name: "Ravi Singh", mobile: "9810022891", vehicle: "DL 1A 4482", unit: "ALS-12" },
    { name: "Imran Khan", mobile: "9811456702", vehicle: "HR 55 AM 2219", unit: "BLS-07" },
    { name: "Deepak Chauhan", mobile: "9873341208", vehicle: "UP 16 AT 7741", unit: "ALS-04" },
    { name: "Sunil Rawat", mobile: "9999873341", vehicle: "DL 9C AM 3306", unit: "ICU-02" },
  ],
  homecare: [
    { name: "Nurse Meena Joshi", mobile: "9812234098" },
    { name: "Nurse Ankit Sharma", mobile: "9876511044" },
    { name: "Caregiver Kavita Rai", mobile: "9999467812" },
    { name: "Physio Rohan Malhotra", mobile: "9818890234" },
  ],
  lab: [
    { name: "Phlebotomist Kiran Das", mobile: "9815567023" },
    { name: "Phlebotomist Farhan Ali", mobile: "9871204456" },
    { name: "Collection exec. Nisha Bhat", mobile: "9999312087" },
    { name: "Phlebotomist Vivek Tiwari", mobile: "9817743091" },
  ],
  radiology: [
    { name: "Coordinator Alka Gupta", mobile: "9813340082" },
    { name: "Coordinator Mohit Jain", mobile: "9876651290" },
    { name: "Desk exec. Sneha Kapoor", mobile: "9999021876" },
  ],
  stepdown: [
    { name: "Coordinator Priya Menon", mobile: "9814456720" },
    { name: "Coordinator Arun Bedi", mobile: "9877783451" },
    { name: "Admission desk Reena Pal", mobile: "9999182034" },
  ],
};

export function withAssignedAgent(record, kind = recordKind(record)) {
  const id = recordId(record, kind) || record?.bookingId || record?.requestId || record?.id;
  const pool = AGENT_ROSTER[kind] || AGENT_ROSTER.medicine;
  const pick = pool[hashSeed(String(id || "medihome")) % pool.length];
  return {
    ...record,
    agentName: record.agentName || pick.name,
    agentMobile: record.agentMobile || pick.mobile,
    agentVehicle: record.agentVehicle || pick.vehicle || "",
    agentUnit: record.agentUnit || pick.unit || "",
    agentRole: record.agentRole || partnerRole(kind),
  };
}

export function partnerCopy(kind) {
  switch (kind) {
    case "ambulance":
      return {
        title: "Ambulance unit",
        toward: "toward your pickup PIN",
        emoji: "🚑",
      };
    case "homecare":
      return {
        title: "Care partner",
        toward: "toward your visit PIN",
        emoji: "🩺",
      };
    case "stepdown":
      return {
        title: "Recovery centre",
        toward: "toward your recovery PIN",
        emoji: "🏥",
      };
    case "lab":
      return {
        title: "Collection partner",
        toward: "toward your collection PIN",
        emoji: "🧪",
      };
    case "radiology":
      return {
        title: "Imaging partner",
        toward: "toward your appointment PIN",
        emoji: "🏥",
      };
    default:
      return {
        title: "Delivery partner",
        toward: "toward your delivery PIN",
        emoji: "🛵",
      };
  }
}

export function stepLabel(kind, key) {
  if (key === "done") return doneLabel(kind);
  return TRACK_STEPS.find((step) => step.key === key)?.label || "Confirmed";
}

export function recordKind(record, fallback = "medicine") {
  if (record?.kind) return record.kind;
  if (record?.orderType === "lab" || record?.serviceType === "lab") return "lab";
  if (record?.orderType === "radiology" || record?.serviceType === "radiology") {
    return "radiology";
  }
  if (record?.orderType === "homecare" || record?.bookingId?.startsWith("MH-HC-")) {
    return "homecare";
  }
  if (record?.orderType === "stepdown" || record?.bookingId?.startsWith("MH-SD-")) {
    return "stepdown";
  }
  if (record?.orderType === "ambulance" || record?.requestId) return "ambulance";
  if (record?.bookingId) return record.serviceType === "radiology" ? "radiology" : "lab";
  return fallback;
}

export function recordId(record, kind = recordKind(record)) {
  if (kind === "ambulance") return String(record.requestId || record.id || "");
  if (kind === "homecare" || kind === "stepdown" || kind === "lab" || kind === "radiology") {
    return String(record.bookingId || record.id || "");
  }
  return String(record.id || "");
}

function sameRecord(row, unified) {
  const kind = unified.kind;
  const id = String(unified.id);
  if (kind === "ambulance") return String(row.requestId || row.id) === id;
  if (kind === "homecare" || kind === "stepdown" || kind === "lab" || kind === "radiology") {
    return String(row.bookingId || row.id) === id;
  }
  return String(row.id) === id;
}

export function seedPartnerStart(destLat, destLng, seed, kind) {
  const hash = hashSeed(seed);
  const angle = ((hash % 360) * Math.PI) / 180;
  const km = kind === "ambulance" ? 2.5 + (hash % 110) / 100 : 1.2 + (hash % 90) / 100;
  const dLat = (km / 111.32) * Math.cos(angle);
  const cosLat = Math.cos((destLat * Math.PI) / 180) || 0.75;
  const dLng = (km / (111.32 * cosLat)) * Math.sin(angle);
  return { lat: destLat + dLat, lng: destLng + dLng };
}

function lerpPath(start, dest, t, seed) {
  const clamped = Math.min(1, Math.max(0, t));
  const hash = hashSeed(seed);
  const bulge = 0.16 + (hash % 12) / 100;
  const sign = hash % 2 === 0 ? 1 : -1;
  const midLat = (start.lat + dest.lat) / 2;
  const midLng = (start.lng + dest.lng) / 2;
  const control = {
    lat: midLat - (dest.lng - start.lng) * bulge * sign,
    lng: midLng + (dest.lat - start.lat) * bulge * sign,
  };
  const u = 1 - clamped;
  return {
    lat: u * u * start.lat + 2 * u * clamped * control.lat + clamped * clamped * dest.lat,
    lng: u * u * start.lng + 2 * u * clamped * control.lng + clamped * clamped * dest.lng,
  };
}

export function haversineKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function statusFromProgress(progress) {
  if (progress >= 0.94) return "done";
  if (progress >= 0.72) return "arriving";
  if (progress >= 0.2) return "on_the_way";
  if (progress >= 0.08) return "assigned";
  return "confirmed";
}

export function trackingProgress(record, now = Date.now()) {
  if (record?.trackCompleted) return 1;
  const started = Number(record?.trackStartedAt);
  const kind = recordKind(record);
  const duration = DURATION_MS[kind] || DURATION_MS.medicine;
  if (!Number.isFinite(started) || started <= 0) return 0;
  return Math.min(1, Math.max(0, (now - started) / duration));
}

export function etaLabel(record, now = Date.now()) {
  if (record?.trackCompleted) return "Arrived";
  const kind = recordKind(record);
  const duration = DURATION_MS[kind] || DURATION_MS.medicine;
  const started = Number(record?.trackStartedAt) || now;
  const remaining = Math.max(0, duration - (now - started));
  const minutes = Math.max(1, Math.round(remaining / 60000));
  if (remaining < 45000) return "Arriving now";
  return `${minutes} min`;
}

function destFromRecord(record) {
  const display = pinLocationForDisplay(record);
  if (Number.isFinite(display.lat) && Number.isFinite(display.lng)) {
    return display;
  }
  const destLat = Number(record?.destLat);
  const destLng = Number(record?.destLng);
  if (Number.isFinite(destLat) && Number.isFinite(destLng)) {
    return { ...display, lat: destLat, lng: destLng };
  }
  return display;
}

export function withTracking(record, kind = recordKind(record)) {
  const pin = normalizePin(record?.pin || record?.pinCode);
  const dest = destFromRecord({ ...record, pin, pinCode: pin || record?.pinCode });
  const destLat = Number.isFinite(dest.lat) ? dest.lat : null;
  const destLng = Number.isFinite(dest.lng) ? dest.lng : null;
  const id = recordId(record, kind) || String(Date.now());
  const hasStart =
    Number.isFinite(Number(record.startLat)) && Number.isFinite(Number(record.startLng));
  const start = hasStart
    ? { lat: Number(record.startLat), lng: Number(record.startLng) }
    : destLat != null
      ? seedPartnerStart(destLat, destLng, id, kind)
      : { lat: null, lng: null };
  const startedAt = Number(record.trackStartedAt) || Date.now();
  const completed = Boolean(record.trackCompleted);
  const progress = completed ? 1 : trackingProgress({ ...record, trackStartedAt: startedAt, kind }, Date.now());
  const live =
    destLat != null && start.lat != null
      ? lerpPath(start, { lat: destLat, lng: destLng }, progress, id)
      : { lat: start.lat, lng: start.lng };
  const statusKey = completed ? "done" : statusFromProgress(progress);
  const assigned = withAssignedAgent({ ...record, kind }, kind);
  return {
    ...assigned,
    kind,
    pin,
    pinCode: pin || record.pinCode || "",
    lat: destLat ?? record.lat ?? null,
    lng: destLng ?? record.lng ?? null,
    destLat,
    destLng,
    locality: record.locality || dest.locality || "",
    mapsUrl: record.mapsUrl || dest.mapsUrl || "",
    startLat: start.lat,
    startLng: start.lng,
    partnerLat: completed && destLat != null ? destLat : live.lat,
    partnerLng: completed && destLng != null ? destLng : live.lng,
    trackStartedAt: startedAt,
    trackLastAt: Date.now(),
    trackStatus: statusKey,
    trackCompleted: completed || progress >= 1,
    status: stepLabel(kind, statusKey),
  };
}

export function tickTracking(record, now = Date.now()) {
  const kind = recordKind(record);
  if (!Number.isFinite(Number(record?.destLat)) || !Number.isFinite(Number(record?.destLng))) {
    return record;
  }
  if (record.trackCompleted) {
    return {
      ...record,
      partnerLat: record.destLat,
      partnerLng: record.destLng,
      trackStatus: "done",
      status: stepLabel(kind, "done"),
    };
  }
  const next = withTracking({ ...record, trackCompleted: false }, kind);
  const progress = trackingProgress(next, now);
  const statusKey = statusFromProgress(progress);
  const done = progress >= 1;
  const point = done
    ? { lat: next.destLat, lng: next.destLng }
    : lerpPath(
        { lat: next.startLat, lng: next.startLng },
        { lat: next.destLat, lng: next.destLng },
        progress,
        recordId(next, kind)
      );
  return {
    ...next,
    partnerLat: point.lat,
    partnerLng: point.lng,
    trackLastAt: now,
    trackStatus: done ? "done" : statusKey,
    trackCompleted: done,
    status: stepLabel(kind, done ? "done" : statusKey),
  };
}

export function unifyOrder(record, kind) {
  const resolvedKind = kind || recordKind(record);
  const tracked = record.trackStartedAt
    ? withTracking(record, resolvedKind)
    : withAssignedAgent({ ...record, kind: resolvedKind }, resolvedKind);
  const id = recordId(tracked, resolvedKind);
  const items =
    Array.isArray(tracked.items) && tracked.items.length
      ? tracked.items
      : Array.isArray(tracked.tests) && tracked.tests.length
        ? tracked.tests
        : tracked.carePlanLabel || tracked.serviceLabel
          ? [
              {
                name: [tracked.serviceLabel, tracked.carePlanLabel]
                  .filter(Boolean)
                  .join(" · "),
              },
            ]
          : tracked.emergencyType
            ? [
                {
                  name:
                    tracked.emergencyType === "emergency"
                      ? "Emergency ambulance"
                      : "Non-emergency ambulance",
                },
              ]
            : [];
  return {
    ...tracked,
    ...withDeliveryOutlet(tracked),
    kind: resolvedKind,
    id,
    orderType: resolvedKind,
    displayId: id,
    date: tracked.date || tracked.bookedAt || tracked.requestedAt || "",
    address: tracked.deliveryAddress || tracked.address || tracked.pickupAddress || "",
    deliveryAddress: tracked.deliveryAddress || tracked.address || tracked.pickupAddress || "",
    items,
    total: tracked.total ?? tracked.charges ?? null,
    pinCode: tracked.pinCode || tracked.pin || "",
    sortKey:
      Number(tracked.sortKey) ||
      Number(tracked.id) ||
      Number(tracked.bookedAtMs) ||
      Number(tracked.requestedAtMs) ||
      0,
  };
}

export function loadAllOrders() {
  const medicines = readList(ORDER_STORAGE.medicine).map((row) => unifyOrder(row, "medicine"));
  const diagnostics = readList(ORDER_STORAGE.lab).map((row) =>
    unifyOrder(row, row.serviceType === "radiology" ? "radiology" : "lab")
  );
  const homeCare = readList(ORDER_STORAGE.homecare).map((row) => unifyOrder(row, "homecare"));
  const stepDown = readList(ORDER_STORAGE.stepdown).map((row) => unifyOrder(row, "stepdown"));
  const ambulance = readList(ORDER_STORAGE.ambulance).map((row) => unifyOrder(row, "ambulance"));
  return [...diagnostics, ...homeCare, ...stepDown, ...ambulance, ...medicines].sort(
    (a, b) => (b.sortKey || 0) - (a.sortKey || 0)
  );
}

export function findOrderById(id) {
  const wanted = decodeURIComponent(String(id || "")).trim();
  if (!wanted) return null;
  return loadAllOrders().find((order) => String(order.id) === wanted) || null;
}

export function persistOrder(unified, patch = {}) {
  const kind = unified.kind || recordKind(unified);
  const next = { ...unified, ...patch, kind };
  const key = ORDER_STORAGE[kind] || ORDER_STORAGE.medicine;
  const list = readList(key);
  const updated = list.some((row) => sameRecord(row, next));
  const nextList = updated
    ? list.map((row) => (sameRecord(row, next) ? stripViewFields({ ...row, ...next }) : row))
    : [stripViewFields(next), ...list];
  writeList(key, nextList);
  const saved = unifyOrder(next, kind);
  publishOrder(saved);
  return saved;
}

function stripViewFields(record) {
  const next = { ...record };
  delete next.sortKey;
  delete next.displayId;
  delete next.kind;
  if (next.serviceType) delete next.orderType;
  return next;
}

export async function attachPinAndTracking(record, pinValue) {
  const pin = normalizePin(pinValue);
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("Enter a valid 6-digit PIN.");
  }
  const gps = await resolvePinLocation(pin);
  const kind = recordKind(record);
  const next = withTracking(
    {
      ...record,
      ...gps,
      pin,
      pinCode: gps.pinCode || pin,
    },
    kind
  );
  return persistOrder(next);
}

export function ensureTracking(record) {
  const kind = recordKind(record);
  const pin = normalizePin(record?.pin || record?.pinCode);
  if (!/^\d{6}$/.test(pin)) return unifyOrder(record, kind);
  if (record.trackStartedAt && Number.isFinite(Number(record.destLat))) {
    return unifyOrder(tickTracking(withTracking(record, kind)), kind);
  }
  const dest = destFromRecord(record);
  const seeded = dest.lat == null ? { ...record, ...locationFromPinSync(pin) } : record;
  return persistOrder(withTracking(seeded, kind));
}
