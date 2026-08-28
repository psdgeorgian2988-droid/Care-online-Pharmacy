import {
  emptyAddress,
  pickAddress,
  validateAddress,
} from "./addressFields.js";
import { normalizeAge, normalizeGender, pickFamilyMembers } from "./personFields.js";

export const SELF_BOOKING_ID = "self";
export const OTHER_BOOKING_ID = "other";

function registeredMobile(profile = {}) {
  return String(profile.mobile || profile.mobileNumber || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

export function isRegisteredMember(profile = {}) {
  const name = String(profile.name || "").trim();
  const mobile = registeredMobile(profile);
  return Boolean(name && /^[6-9]\d{9}$/.test(mobile));
}

export function hasHouseholdProfile(profile = {}) {
  return (
    isRegisteredMember(profile) || Boolean(String(profile.name || "").trim())
  );
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

export function bookingForOptions(profile = {}, { includeOther = true } = {}) {
  const selfName = String(profile.name || "").trim();
  const self = {
    id: SELF_BOOKING_ID,
    name: selfName,
    relation: "self",
    gender: profile.gender || "",
    age: profile.age || "",
    dob: profile.dob || "",
    mobile: registeredMobile(profile),
    label: selfName,
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
  if (!includeOther) return [self, ...members].filter((row) => row.name);
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
  if (option.id === OTHER_BOOKING_ID) return "Someone Else";
  return option.name || "Registered member";
}

export function findBookingFor(profile, id, options) {
  return bookingForOptions(profile, options).find((row) => row.id === id) || null;
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

export function shouldAskBookingDetails(source = {}, profile = {}) {
  if (!hasHouseholdProfile(profile)) return true;
  return isOtherBooking(source);
}

export function shouldAskBookingName(source = {}, profile = {}) {
  return shouldAskBookingDetails(source, profile);
}

export function shouldAskBookingContact(source = {}, profile = {}) {
  return shouldAskBookingDetails(source, profile);
}

export function withBookingIdentity(source = {}, profile = {}) {
  const option = findBookingFor(profile, source.bookedFor);
  const household =
    option && option.id !== OTHER_BOOKING_ID
      ? bookingForPatch(option, profile)
      : {};
  const askContact = shouldAskBookingContact(source, profile);
  const contact = askContact
    ? {
        mobile: String(source.mobile || "")
          .replace(/\D/g, "")
          .slice(0, 10),
        ...pickAddress(source),
      }
    : {
        mobile:
          registeredMobile(profile) ||
          String(source.mobile || "")
            .replace(/\D/g, "")
            .slice(0, 10),
        ...pickAddress(profile),
        addressConfirmed: "yes",
      };
  const askDetails = shouldAskBookingDetails(source, profile);
  const patientName = askDetails
    ? String(source.patientName || "").trim()
    : String(
        household.patientName || source.patientName || profile.name || ""
      ).trim();
  return {
    ...source,
    ...household,
    ...contact,
    patientName,
    gender: askDetails
      ? normalizeGender(source.gender)
      : household.gender || source.gender || profile.gender || "",
    age: askDetails
      ? normalizeAge(source.age)
      : household.age || source.age || profile.age || "",
    dob: askDetails ? source.dob || "" : household.dob || source.dob || "",
  };
}

export function validateBookingContact(source = {}, profile = {}) {
  const contact = withBookingIdentity(source, profile);
  const errors = {};
  const mobile = String(contact.mobile || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }
  const ask = shouldAskBookingContact(source, profile);
  Object.assign(
    errors,
    validateAddress(ask ? contact : { ...contact, addressConfirmed: "yes" })
  );
  return errors;
}

export function validateBookingDetails(source = {}, profile = {}) {
  const errors = {
    ...validateBookingFor(source, profile),
  };
  if (!shouldAskBookingDetails(source, profile)) return errors;
  const identity = withBookingIdentity(source, profile);
  if (!identity.patientName) {
    errors.patientName = "Patient name is required.";
  }
  if (!normalizeGender(identity.gender || source.gender)) {
    errors.gender = "Select Male or Female.";
  }
  const age = Number(normalizeAge(identity.age || source.age));
  if (!Number.isInteger(age) || String(source.age || identity.age || "") === "" || age < 0 || age > 120) {
    errors.age = "Enter age in years.";
  }
  Object.assign(errors, validateBookingContact(source, profile));
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
  return bookingForPatch(null, profile);
}

export function accountOwnerBooking(profile = {}) {
  const selfName = String(profile.name || "").trim();
  if (!selfName) return bookingForPatch(null, profile);
  return bookingForPatch(
    {
      id: SELF_BOOKING_ID,
      name: selfName,
      relation: "self",
      gender: profile.gender || "",
      age: profile.age || "",
      dob: profile.dob || "",
      mobile: registeredMobile(profile),
    },
    profile
  );
}

export function validateBookingFor(source = {}, profile = {}) {
  if (!hasHouseholdProfile(profile)) return {};
  const options = bookingForOptions(profile);
  if (!source.bookedFor || !options.some((row) => row.id === source.bookedFor)) {
    return {
      bookedFor: "Select who this medicine or service is being booked for.",
    };
  }
  return {};
}
