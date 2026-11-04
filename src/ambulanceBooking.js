export const AMBULANCE_TYPES = [
  { value: "emergency", label: "Emergency", fee: 3999 },
  { value: "life-support", label: "Life support", fee: 3999 },
  { value: "patient-transport", label: "Patient transport", fee: 2499 },
];

export function ambulanceTypeLabel(value) {
  const found = AMBULANCE_TYPES.find((row) => row.value === value);
  if (found) return found.label;
  if (value === "non-emergency") return "Non-emergency";
  return "Not provided";
}

export function ambulanceIsUrgent(value) {
  return value === "emergency" || value === "life-support";
}

export function placedCoords(lat, lng) {
  if (lat == null || lng == null || lat === "" || lng === "") return false;
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln);
}

export function urgentAmbulanceErrors({
  mobile,
  lat,
  lng,
  liveGps,
  pinCode,
  destinationAddress,
  startMode,
  pickupAddress,
  dearOneMobile,
} = {}) {
  const errors = {};
  const digits = String(mobile || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(digits)) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }
  const pin = String(pinCode || "").replace(/\D/g, "");
  const located = placedCoords(lat, lng);
  const addressStart = startMode === "address";
  if (addressStart) {
    if (String(pickupAddress || "").trim().length < 3) {
      errors.pickupAddress = "Enter the pickup address.";
    }
    if (!/^\d{6}$/.test(pin) || !located) {
      errors.location = "Enter a 6-digit PIN for this address.";
    }
    const dear = String(dearOneMobile || "").replace(/\D/g, "");
    if (dear && !/^[6-9]\d{9}$/.test(dear)) {
      errors.dearOneMobile = "Enter a 10-digit mobile, or leave it blank.";
    }
  } else if (liveGps !== true || !located) {
    errors.location = "Share the location where you are booking.";
  }
  if (String(destinationAddress || "").trim().length < 3) {
    errors.destinationAddress = "Enter the drop location.";
  }
  return errors;
}

export function ambulanceFee(value) {
  if (value === "non-emergency" || value === "patient-transport") return 2499;
  return AMBULANCE_TYPES.find((row) => row.value === value)?.fee || 3999;
}

export function ambulanceBookingSummary(order = {}) {
  const name = String(order.patientName || order.name || "").trim() || "Customer";
  const mobile =
    String(order.mobile || order.patientMobile || "").replace(/\D/g, "").slice(-10) ||
    "Not provided";
  const pickupPin = String(order.pinCode || order.pin || "").replace(/\D/g, "").slice(0, 6);
  const pickupLine = String(order.address || order.pickupAddress || "").trim();
  const pickup =
    pickupLine && pickupPin && !pickupLine.includes(pickupPin)
      ? `${pickupLine}, ${pickupPin}`
      : pickupLine || pickupPin || "Not provided";
  const drop = [order.destinationName, order.destinationAddress, order.destinationPin]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
  const lat = Number(order.lat);
  const lng = Number(order.lng);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
  return {
    name,
    mobile,
    pickup,
    drop: drop || "Not provided",
    type: ambulanceTypeLabel(order.emergencyType),
    geoText: hasGeo ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Not shared",
    geoHref: hasGeo
      ? order.mapsUrl || `https://www.google.com/maps?q=${lat},${lng}`
      : "",
    liveGps: order.liveGps === true,
    pin: /^\d{6}$/.test(pickupPin) ? pickupPin : "",
  };
}
