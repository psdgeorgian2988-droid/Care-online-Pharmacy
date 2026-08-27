import {
  genderLabel,
  memberSummary,
  pickFamilyMembers,
} from "./personFields.js";

export const SELF_BOOKING_ID = "self";

export function bookingForOptions(profile = {}) {
  const selfName = String(profile.name || "").trim();
  const self = {
    id: SELF_BOOKING_ID,
    name: selfName,
    relation: "self",
    gender: profile.gender || "",
    age: profile.age || "",
    label: [
      "Myself",
      selfName,
      genderLabel(profile.gender),
      profile.age ? `${profile.age} yrs` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  };
  const members = pickFamilyMembers(profile)
    .filter((row) => row.name)
    .map((row) => ({
      id: row.id,
      name: row.name,
      relation: row.relation,
      gender: row.gender,
      age: row.age,
      label: memberSummary(row),
    }));
  return [self, ...members];
}

export function findBookingFor(profile, id) {
  return bookingForOptions(profile).find((row) => row.id === id) || null;
}

export function bookingForPatch(option) {
  if (!option) {
    return {
      bookedFor: "",
      bookedForName: "",
      bookedForRelation: "",
      patientName: "",
      gender: "",
      age: "",
    };
  }
  return {
    bookedFor: option.id,
    bookedForName: option.name,
    bookedForRelation: option.relation,
    patientName: option.name,
    gender: option.gender,
    age: option.age,
  };
}

export function initialBookingFor(profile = {}) {
  const options = bookingForOptions(profile);
  const hasFamily = options.some((row) => row.id !== SELF_BOOKING_ID);
  if (hasFamily) return bookingForPatch(null);
  return bookingForPatch(options[0]);
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
