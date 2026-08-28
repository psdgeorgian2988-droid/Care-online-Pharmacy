import {
  emptyAddress,
  pickAddress,
  validateAddress,
} from "./addressFields.js";
import { pickFamilyMembers } from "./personFields.js";

export const SELF_BOOKING_ID = "self";
export const OTHER_BOOKING_ID = "other";

function registeredMobile(profile = {}) {
  return String(profile.mobile || profile.mobileNumber || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

export function profileHasBookingContact(profile = {}) {
  const mobile = registeredMobile(profile);
  if (!/^[6-9]\d{9}$/.test(mobile)) return false;
  const addr = pickAddress(profile);
  return Boolean(
    addr.houseNo &&
      addr.society &&
      /^\d{6}$/.test(addr.pinCode) &&
      addr.area &&
      addr.city &&
      addr.district &&
      addr.state
  );
}

export function bookingForOptions(profile = {}) {
  const selfName = String(profile.name || "").trim();
  const self = {
    id: SELF_BOOKING_ID,
    name: selfName,
    relation: "self",
    gender: profile.gender || "",
    age: profile.age || "",
    dob: profile.dob || "",
    mobile: registeredMobile(profile),
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
      dob: row.dob,
      mobile: String(row.mobile || registeredMobile(profile))
        .replace(/\D/g, "")
        .slice(0, 10),
      label: row.name,
    }));
  const other = {
    id: OTHER_BOOKING_ID,
    name: "",
    relation: "other",
    gender: "",
    age: "",
    dob: "",
    mobile: "",
    label: "Someone Else",
  };
  return [self, ...members, other];
}

export function bookingForSelectLabel(option) {
  if (!option) return "";
  if (option.id === SELF_BOOKING_ID) return "Self";
  if (option.id === OTHER_BOOKING_ID) return "Someone Else";
  return option.name || "Family member";
}

export function findBookingFor(profile, id) {
  return bookingForOptions(profile).find((row) => row.id === id) || null;
}

export function isOtherBooking(source = {}) {
  return source.bookedFor === OTHER_BOOKING_ID;
}

export function isHouseholdBooking(source = {}, profile = {}) {
  const id = String(source.bookedFor || "");
  if (!id || id === OTHER_BOOKING_ID) return false;
  return bookingForOptions(profile).some(
    (row) => row.id === id && row.id !== OTHER_BOOKING_ID
  );
}

export function shouldAskBookingContact(source = {}, profile = {}) {
  if (isOtherBooking(source)) return true;
  if (isHouseholdBooking(source, profile) || !source.bookedFor) {
    return !profileHasBookingContact(profile);
  }
  return true;
}

export function validateBookingContact(source = {}, profile = {}) {
  const errors = {};
  const mobile = String(source.mobile || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }
  const ask = shouldAskBookingContact(source, profile);
  Object.assign(
    errors,
    validateAddress(ask ? source : { ...source, addressConfirmed: "yes" })
  );
  return errors;
}

export function bookingForPatch(option, profile = {}) {
  const mobile = registeredMobile(profile);
  const address = pickAddress(profile);
  const hasAddress = Boolean(address.pinCode || address.houseNo || address.society);
  const fromRegister = {
    ...(mobile ? { mobile } : {}),
    ...(hasAddress ? { ...address, addressConfirmed: "yes" } : {}),
  };
  if (!option) {
    return {
      bookedFor: "",
      bookedForName: "",
      bookedForRelation: "",
      patientName: "",
      gender: "",
      age: "",
      dob: "",
      ...fromRegister,
    };
  }
  if (option.id === OTHER_BOOKING_ID) {
    return {
      bookedFor: OTHER_BOOKING_ID,
      bookedForName: "",
      bookedForRelation: "other",
      patientName: "",
      gender: "",
      age: "",
      dob: "",
      mobile: "",
      ...emptyAddress(),
    };
  }
  return {
    bookedFor: option.id,
    bookedForName: option.name,
    bookedForRelation: option.relation,
    patientName: option.name,
    gender: option.gender,
    age: option.age,
    dob: option.dob || "",
    ...(option.mobile || mobile ? { mobile: option.mobile || mobile } : {}),
    ...(hasAddress ? { ...address, addressConfirmed: "yes" } : {}),
  };
}

export function initialBookingFor(profile = {}) {
  const options = bookingForOptions(profile);
  const hasFamily = options.some(
    (row) => row.id !== SELF_BOOKING_ID && row.id !== OTHER_BOOKING_ID
  );
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
