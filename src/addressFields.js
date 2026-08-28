import {
  emptyPerson,
  pickFamilyMembers,
  pickPerson,
} from "./personFields.js";

export const EMPTY_ADDRESS = {
  houseNo: "",
  society: "",
  area: "",
  city: "",
  district: "",
  state: "",
  pinCode: "",
  nearby: "",
  addressConfirmed: "",
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
    name: "pinCode",
    label: "PIN Code",
    placeholder: "6-digit PIN",
    inputMode: "numeric",
    maxLength: 6,
  },
  {
    name: "area",
    label: "Village / Sector / Mohalla",
    placeholder: "Select for this PIN",
    afterPin: true,
    select: true,
  },
  {
    name: "city",
    label: "City",
    placeholder: "Filled from PIN Code",
    afterPin: true,
    auto: true,
  },
  {
    name: "district",
    label: "District",
    placeholder: "Filled from PIN Code",
    afterPin: true,
    auto: true,
  },
  {
    name: "state",
    label: "State",
    placeholder: "Filled from PIN Code",
    afterPin: true,
    auto: true,
  },
  {
    name: "nearby",
    label: "Landmark Near By",
    placeholder: "Temple, metro, market",
    required: false,
  },
];

export function visibleAddressFields(pinReady = false) {
  return ADDRESS_FIELDS.filter((field) => {
    if (field.hidden) return false;
    if (field.afterPin && !pinReady) return false;
    return true;
  });
}

function clean(value) {
  return String(value || "").trim();
}

export function emptyAddress() {
  return { ...EMPTY_ADDRESS };
}

export function isAddressConfirmed(value) {
  return value === true || value === "yes" || value === "true";
}

export function pickAddress(source = {}) {
  return {
    houseNo: clean(source.houseNo),
    society: clean(source.society),
    area: clean(source.area),
    city: clean(source.city),
    district: clean(source.district),
    state: clean(source.state),
    pinCode: String(source.pinCode || source.pincode || source.pin || "")
      .replace(/\D/g, "")
      .slice(0, 6),
    nearby: clean(source.nearby),
    addressConfirmed: isAddressConfirmed(source.addressConfirmed) ? "yes" : "",
  };
}

export function addressConfirmRows(source = {}) {
  const addr = pickAddress(source);
  return [
    ["Flat / House No.", addr.houseNo],
    ["Society / Mohalla / Gali No.", addr.society],
    ["PIN Code", addr.pinCode],
    ["Village / Sector / Mohalla", addr.area],
    ["City", addr.city],
    ["District", addr.district],
    ["State", addr.state],
    ["Landmark Near By", addr.nearby || "—"],
  ];
}

export function addressFromUnknown(source = {}) {
  const next = pickAddress(source);
  const hasStructured = Boolean(
    next.houseNo ||
      next.society ||
      next.area ||
      next.city ||
      next.district ||
      next.state ||
      next.nearby
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
  const parts = [addr.houseNo, addr.society];
  if (addr.area && addr.area !== addr.society) parts.push(addr.area);
  if (addr.nearby) parts.push(`Near ${addr.nearby}`);
  if (addr.city && addr.city !== addr.area) parts.push(addr.city);
  if (addr.district && addr.district !== addr.city && addr.district !== addr.area) {
    parts.push(addr.district);
  }
  parts.push(addr.state, addr.pinCode);
  return parts.filter(Boolean).join(", ");
}

export function validateAddress(source = {}) {
  const addr = pickAddress(source);
  const errors = {};
  if (!addr.houseNo) errors.houseNo = "Flat / House No. is required.";
  if (!addr.society) errors.society = "Society / Mohalla / Gali No. is required.";
  if (!/^\d{6}$/.test(addr.pinCode)) {
    errors.pinCode = "Enter a valid 6-digit PIN Code.";
  } else if (!addr.area || !addr.city || !addr.district || !addr.state) {
    errors.pinCode =
      "Enter a valid PIN Code and select the Village / Sector / Mohalla attached to it.";
    if (!addr.area) errors.area = "Select the Village / Sector / Mohalla for this PIN.";
  } else if (!isAddressConfirmed(addr.addressConfirmed)) {
    errors.addressConfirmed =
      "Please recheck and confirm these details before submitting.";
  }
  return errors;
}

export function withFormattedAddress(source = {}) {
  const addr = pickAddress(source);
  const formatted = formatAddress(addr);
  return {
    ...addr,
    addressConfirmed: "",
    address: formatted,
    deliveryAddress: formatted,
    pickupAddress: formatted,
  };
}

export function applyResolvedPin(source = {}, gps = {}) {
  const merged = {
    ...source,
      area: gps.area || gps.locality || source.area,
    city: gps.city || source.city,
    district: gps.district || source.district,
    state: gps.state || source.state,
    pinCode: gps.pinCode || source.pinCode,
  };
  const formatted = withFormattedAddress(merged);
  return {
    ...formatted,
    pinCode: gps.pinCode || formatted.pinCode,
    pin: gps.pin,
    lat: gps.lat,
    lng: gps.lng,
    locality: gps.area || gps.locality,
    mapsUrl: gps.mapsUrl,
  };
}

export function readUserProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    if (!parsed || typeof parsed !== "object") {
      return { name: "", mobile: "", ...emptyPerson(), familyMembers: [], ...emptyAddress() };
    }
    return {
      name: String(parsed.name || parsed.fullName || "").trim(),
      mobile: String(parsed.mobile || parsed.mobileNumber || "").trim(),
      ...pickPerson(parsed),
      familyMembers: pickFamilyMembers(parsed),
      ...addressFromUnknown(parsed),
    };
  } catch {
    return { name: "", mobile: "", ...emptyPerson(), familyMembers: [], ...emptyAddress() };
  }
}
