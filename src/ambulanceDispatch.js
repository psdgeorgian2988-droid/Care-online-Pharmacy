import { locationFromPinSync } from "./pinLocation.js";
import { partnerAppKind } from "./partnerApp.js";
import { initialOrderStatus } from "./orderConfirm.js";

export function ambulanceCategory(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "non-emergency" || key === "transfer") return "patient-transport";
  if (key === "emergency" || key === "life-support" || key === "patient-transport") return key;
  return "";
}

function haversineKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function customerPoint({ lat, lng, pin } = {}) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0)) {
    return { lat: latitude, lng: longitude };
  }
  const located = locationFromPinSync(pin);
  if (Number.isFinite(located.lat) && Number.isFinite(located.lng)) {
    return { lat: located.lat, lng: located.lng };
  }
  return null;
}

function partnerPoint(partner) {
  return customerPoint({ lat: partner?.lat, lng: partner?.lng, pin: partner?.pins?.[0] });
}

function vehicleOf(member) {
  const type = ambulanceCategory(member?.profile?.ambulanceType || member?.role);
  const vehicleNumber = String(member?.profile?.vehicleNumber || "").trim().toUpperCase();
  if (!type || vehicleNumber.length < 4) return null;
  if (member?.status === "rejected") return null;
  return {
    memberId: String(member.id || "").trim(),
    type,
    vehicleNumber,
    driverName: String(member.name || "").trim(),
    driverMobile: String(member.mobile || "").replace(/\D/g, "").slice(-10),
  };
}

export function ambulanceJobOpen(order) {
  const kind = String(order?.kind || order?.orderType || order?.serviceType || "").toLowerCase();
  if (kind !== "ambulance") return false;
  if (order?.cancelled === true) return false;
  const status = String(order?.trackStatus || "").toLowerCase();
  const confirm = String(order?.partnerConfirmStatus || "").toLowerCase();
  if (status === "done" || status === "declined" || status === "cancelled" || confirm === "declined") {
    return false;
  }
  return Boolean(String(order?.teamMemberId || "").trim() || String(order?.vehicleNumber || "").trim());
}

function engagedKeys(orders = [], excludeIds = []) {
  const engaged = new Set();
  for (const order of orders) {
    if (!ambulanceJobOpen(order)) continue;
    const member = String(order.teamMemberId || "").trim();
    const vehicle = String(order.vehicleNumber || "").trim().toUpperCase();
    if (member) engaged.add(member);
    if (vehicle) engaged.add(vehicle);
  }
  for (const id of excludeIds) {
    const key = String(id || "").trim();
    if (!key) continue;
    engaged.add(key);
    engaged.add(key.toUpperCase());
  }
  return engaged;
}

/** The single nearest free ambulance of this category. Engaged vehicles are left out. */
export function nearestAvailableAmbulance({
  partners = [],
  orders = [],
  category,
  lat,
  lng,
  pin,
  excludeIds = [],
} = {}) {
  const wanted = ambulanceCategory(category);
  const customer = customerPoint({ lat, lng, pin });
  if (!wanted || !customer) return null;
  const engaged = engagedKeys(orders, excludeIds);
  let best = null;
  for (const partner of partners) {
    if (!partner || partner.approved === false) continue;
    if (partnerAppKind(partner) !== "ambulance") continue;
    const point = partnerPoint(partner);
    const distance = point ? haversineKm(customer, point) : null;
    if (distance == null) continue;
    for (const member of partner.team || []) {
      const vehicle = vehicleOf(member);
      if (!vehicle || vehicle.type !== wanted) continue;
      if (engaged.has(vehicle.memberId) || engaged.has(vehicle.vehicleNumber)) continue;
      const row = {
        partnerId: partner.id,
        partnerName: partner.name || "Ambulance",
        ...vehicle,
        lat: point.lat,
        lng: point.lng,
        distanceKm: Math.round(distance * 10) / 10,
      };
      if (!best || row.distanceKm < best.distanceKm) best = row;
    }
  }
  return best;
}

export function ambulanceOfferFields(unit) {
  if (!unit) return null;
  return {
    ...initialOrderStatus("ambulance"),
    partnerId: unit.partnerId,
    partnerName: unit.partnerName,
    partner: unit.partnerName,
    teamMemberId: unit.memberId,
    vehicleNumber: unit.vehicleNumber,
    ambulanceDriver: unit.driverName,
    ambulanceDriverMobile: unit.driverMobile,
    technicianName: unit.driverName,
    technicianMobile: unit.driverMobile,
    ambulanceDistanceKm: unit.distanceKm,
    ambulanceLat: unit.lat,
    ambulanceLng: unit.lng,
    status: "Waiting for the ambulance to accept",
    partnerConfirmed: false,
    partnerConfirmStatus: "pending",
    trackStatus: "requested",
    trackCompleted: false,
  };
}

export function ambulancePublicOffer(unit) {
  if (!unit) return null;
  return {
    partnerId: unit.partnerId,
    partnerName: unit.partnerName,
    vehicleNumber: unit.vehicleNumber,
    driverName: unit.driverName,
    ambulanceType: unit.type,
    distanceKm: unit.distanceKm,
  };
}

export function nextAmbulanceOffer(existing, partners = [], orders = []) {
  const exclude = [
    ...(Array.isArray(existing?.declinedAmbulanceIds) ? existing.declinedAmbulanceIds : []),
    existing?.teamMemberId,
    existing?.vehicleNumber,
  ];
  const currentId = String(existing?.id || existing?.bookingId || existing?.requestId || "");
  const unit = nearestAvailableAmbulance({
    partners,
    orders: orders.filter((row) => {
      const id = String(row?.id || row?.bookingId || row?.requestId || "");
      return id !== currentId;
    }),
    category: existing?.emergencyType,
    lat: existing?.lat,
    lng: existing?.lng,
    pin: existing?.pinCode || existing?.pin,
    excludeIds: exclude,
  });
  if (!unit) return null;
  return {
    ...ambulanceOfferFields(unit),
    declinedAmbulanceIds: exclude.map((id) => String(id || "").trim()).filter(Boolean),
  };
}
