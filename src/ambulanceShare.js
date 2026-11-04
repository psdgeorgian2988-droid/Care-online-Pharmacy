export function ambulanceTrackUrl(order = {}) {
  const id = String(order.requestId || order.id || order.bookingId || "").trim();
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://medihome.co.in";
  return `${origin}/#track?id=${encodeURIComponent(id)}`;
}

export function ambulanceShareText(order = {}) {
  const vehicle = String(order.vehicleNumber || "").trim();
  const unit = vehicle ? ` (${vehicle})` : "";
  return `MediHome ambulance${unit} is booked. Follow its live location: ${ambulanceTrackUrl(order)}`;
}

export function whatsappShareHref(mobile, text) {
  const digits = String(mobile || "").replace(/\D/g, "").slice(-10);
  const encoded = encodeURIComponent(text);
  if (/^[6-9]\d{9}$/.test(digits)) return `https://wa.me/91${digits}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

export function bookedFromDifferentPlace(order = {}) {
  if (String(order.startMode || "") === "address") return true;
  const pickup = String(order.pickupAddress || order.address || "");
  return Boolean(pickup) && !pickup.startsWith("Live location");
}
