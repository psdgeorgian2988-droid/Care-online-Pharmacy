import { pickFamilyMembers } from "./personFields.js";
import { pickAddress } from "./addressFields.js";

export const SELF_BOOKING_ID = "self";

export function bookingForOptions(profile = {}) {
  const selfName = String(profile.name || "").trim();
  const self = {
    id: SELF_BOOKING_ID,
    name: selfName,
    relation: "self",
    gender: profile.gender || "",
    age: profile.age || "",
    mobile: String(profile.mobile || profile.mobileNumber || "")
      .replace(/\D/g, "")
      .slice(0, 10),
    label: "Self",
  };
  const members = pickFamilyMembers(profile)
    .filter((row) => row.name)
    .map((row) => ({
      id: row.id,
      name: row.name,
      relation: row.relation,
      gender: row.gender,
      age: row.age,
      mobile: String(row.mobile || profile.mobile || profile.mobileNumber || "")
        .replace(/\D/g, "")
        .slice(0, 10),
      label: row.name,
    }));
  return [self, ...members];
}

export function bookingForSelectLabel(option) {
  if (!option || option.id === SELF_BOOKING_ID) return "Self";
  return option.name || "Family member";
}

export function findBookingFor(profile, id) {
  return bookingForOptions(profile).find((row) => row.id === id) || null;
}

export function bookingForPatch(option, profile = {}) {
  const mobile = String(profile.mobile || profile.mobileNumber || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  const address = pickAddress(profile);
  const hasAddress = Boolean(address.pinCode || address.houseNo || address.society);
  const fromRegister = {
    ...(mobile ? { mobile } : {}),
    ...(hasAddress ? address : {}),
  };
  if (!option) {
    return {
      bookedFor: "",
      bookedForName: "",
      bookedForRelation: "",
      patientName: "",
      gender: "",
      age: "",
      ...fromRegister,
    };
  }
  return {
    bookedFor: option.id,
    bookedForName: option.name,
    bookedForRelation: option.relation,
    patientName: option.name,
    gender: option.gender,
    age: option.age,
    ...(option.mobile || mobile ? { mobile: option.mobile || mobile } : {}),
    ...(hasAddress ? address : {}),
  };
}

export function initialBookingFor(profile = {}) {
  const options = bookingForOptions(profile);
  const hasFamily = options.some((row) => row.id !== SELF_BOOKING_ID);
  if (hasFamily) return bookingForPatch(null, profile);
  return bookingForPatch(options[0], profile);
}

export function validateBookingFor(source = {}, profile = {}) {
  const options = bookingForOptions(profile);
  if (!source.bookedFor || !options.some((row) => row.id === source.bookedFor)) {
    return {
      bookedFor: "Select who this medicine or service is being booked for.",
    };
  }
  return {};
}
