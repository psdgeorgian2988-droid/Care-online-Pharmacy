export const EMPTY_ADDRESS = {
  houseNo: "",
  society: "",
  city: "",
  district: "",
  state: "",
  pinCode: "",
  nearby: "",
};

export const ADDRESS_FIELDS = [
  {
    name: "houseNo",
    label: "Flat / House No.",
    placeholder: "Flat, house or plot number",
  },
  {
    name: "society",
    label: "Society / Mohalla / Gali No.",
    placeholder: "Society, mohalla or gali number",
  },
  {
    name: "city",
    label: "City",
    placeholder: "City",
  },
  {
    name: "district",
    label: "District",
    placeholder: "District",
  },
  {
    name: "state",
    label: "State",
    placeholder: "State",
  },
  {
    name: "pinCode",
    label: "PIN Code",
    placeholder: "6-digit PIN",
    inputMode: "numeric",
    maxLength: 6,
  },
  {
    name: "nearby",
    label: "Landmark Near By",
    placeholder: "Temple, metro, market — optional",
    required: false,
    hint: "Optional. You can leave this blank.",
  },
];

function clean(value) {
  return String(value || "").trim();
}

export function emptyAddress() {
  return { ...EMPTY_ADDRESS };
}

export function pickAddress(source = {}) {
  return {
    houseNo: clean(source.houseNo),
    society: clean(source.society || source.locality),
    city: clean(source.city),
    district: clean(source.district),
    state: clean(source.state),
    pinCode: String(source.pinCode || source.pincode || source.pin || "")
      .replace(/\D/g, "")
      .slice(0, 6),
    nearby: clean(source.nearby),
  };
}

export function addressFromUnknown(source = {}) {
  const next = pickAddress(source);
  const hasStructured = Boolean(
    next.houseNo || next.society || next.city || next.district || next.state || next.nearby
  );
  if (!hasStructured) {
    next.society = clean(
      source.address || source.deliveryAddress || source.pickupAddress || source.savedAddress
    );
  }
  return next;
}

export function formatAddress(source = {}) {
  const addr = pickAddress(source);
  return [
    addr.houseNo,
    addr.society,
    addr.nearby ? `Near ${addr.nearby}` : "",
    addr.city,
    addr.district,
    addr.state,
    addr.pinCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function validateAddress(source = {}) {
  const addr = pickAddress(source);
  const errors = {};
  if (!addr.houseNo) errors.houseNo = "Flat / House No. is required.";
  if (!addr.society) errors.society = "Society / Mohalla / Gali No. is required.";
  if (!addr.city) errors.city = "City is required.";
  if (!addr.district) errors.district = "District is required.";
  if (!addr.state) errors.state = "State is required.";
  if (!/^\d{6}$/.test(addr.pinCode)) errors.pinCode = "Enter a valid 6-digit PIN Code.";
  return errors;
}

export function withFormattedAddress(source = {}) {
  const addr = pickAddress(source);
  const formatted = formatAddress(addr);
  return {
    ...addr,
    address: formatted,
    deliveryAddress: formatted,
    pickupAddress: formatted,
  };
}

export function applyResolvedPin(source = {}, gps = {}) {
  const formatted = withFormattedAddress(source);
  return {
    ...formatted,
    pinCode: gps.pinCode || formatted.pinCode,
    pin: gps.pin,
    lat: gps.lat,
    lng: gps.lng,
    locality: gps.locality,
    mapsUrl: gps.mapsUrl,
  };
}

export function readUserProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    if (!parsed || typeof parsed !== "object") {
      return { name: "", mobile: "", ...emptyAddress() };
    }
    return {
      name: String(parsed.name || parsed.fullName || "").trim(),
      mobile: String(parsed.mobile || parsed.mobileNumber || "").trim(),
      ...addressFromUnknown(parsed),
    };
  } catch {
    return { name: "", mobile: "", ...emptyAddress() };
  }
}
