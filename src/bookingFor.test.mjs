import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OTHER_BOOKING_ID,
  SELF_BOOKING_ID,
  bookingForOptions,
  bookingForPatch,
  bookingForSelectLabel,
  findBookingFor,
  hasHouseholdProfile,
  isRegisteredMember,
  bookingReadyForService,
  shouldAskBookingContact,
  shouldAskBookingDetails,
  shouldAskBookingName,
  validateBookingDetails,
} from "./bookingFor.js";

const profile = {
  name: "Anita Sharma",
  mobile: "9876543210",
  gender: "F",
  age: "42",
  houseNo: "12",
  society: "Green Park",
  pinCode: "122006",
  area: "Sector 14",
  city: "Gurugram",
  district: "Gurugram",
  state: "Haryana",
  familyMembers: [
    { id: "fam-1", name: "Aarav Sharma", relation: "son", gender: "M", age: "8" },
    { id: "fam-2", name: "Riya Sharma", relation: "daughter", gender: "F", age: "5" },
  ],
};

test("dropdown lists registered names, then Someone Else last", () => {
  const options = bookingForOptions(profile);
  assert.deepEqual(
    options.map((row) => bookingForSelectLabel(row)),
    ["Anita Sharma", "Aarav Sharma", "Riya Sharma", "Someone Else"]
  );
  assert.equal(options[0].id, SELF_BOOKING_ID);
  assert.equal(options.at(-1).id, OTHER_BOOKING_ID);
});

test("selecting Self fills registered name, gender, age, mobile and address", () => {
  const option = findBookingFor(profile, "self");
  const patch = bookingForPatch(option, profile);
  assert.equal(patch.patientName, "Anita Sharma");
  assert.equal(patch.gender, "F");
  assert.equal(patch.age, "42");
  assert.equal(patch.mobile, "9876543210");
  assert.equal(patch.pinCode, "122006");
  assert.equal(patch.houseNo, "12");
  assert.equal(patch.city, "Gurugram");
});

test("selecting a family member fills that person's name, gender and age, and the registered address", () => {
  const option = findBookingFor(profile, "fam-1");
  const patch = bookingForPatch(option, profile);
  assert.equal(patch.patientName, "Aarav Sharma");
  assert.equal(patch.gender, "M");
  assert.equal(patch.age, "8");
  assert.equal(patch.mobile, "9876543210");
  assert.equal(patch.pinCode, "122006");
  assert.equal(patch.society, "Green Park");
});

test("Someone Else asks for name, age, sex, mobile and address", () => {
  const option = findBookingFor(profile, OTHER_BOOKING_ID);
  const patch = bookingForPatch(option, profile);
  assert.equal(patch.bookedFor, OTHER_BOOKING_ID);
  assert.equal(patch.patientName, "");
  assert.equal(patch.mobile, "");
  assert.equal(patch.pinCode, "");
  assert.equal(shouldAskBookingName(patch, profile), true);
  assert.equal(shouldAskBookingContact(patch, profile), true);
  assert.equal(shouldAskBookingName({ bookedFor: "self" }, profile), false);
  assert.equal(shouldAskBookingContact({ bookedFor: "self" }, profile), false);
  assert.equal(shouldAskBookingName({ bookedFor: "fam-1" }, profile), false);
  assert.equal(shouldAskBookingContact({ bookedFor: "fam-1" }, profile), false);
  const errors = validateBookingDetails(patch, profile);
  assert.equal(errors.patientName, "Patient name is required.");
  assert.equal(errors.gender, "Select Male or Female.");
  assert.equal(errors.age, "Enter age in years.");
});

test("guests are asked name, age, sex, mobile and address", () => {
  const guest = {};
  assert.equal(isRegisteredMember(guest), false);
  assert.equal(shouldAskBookingName({}, guest), true);
  assert.equal(shouldAskBookingContact({}, guest), true);
  const errors = validateBookingDetails({ patientName: "", mobile: "" }, guest);
  assert.equal(errors.patientName, "Patient name is required.");
  assert.equal(errors.gender, "Select Male or Female.");
  assert.equal(errors.age, "Enter age in years.");
  assert.match(errors.mobile, /mobile/i);
});

test("registered Self or family does not require typed name, mobile or address", () => {
  const errors = validateBookingDetails({ bookedFor: "self" }, profile);
  assert.equal(errors.patientName, undefined);
  assert.equal(errors.gender, undefined);
  assert.equal(errors.age, undefined);
  assert.equal(errors.mobile, undefined);
  assert.equal(errors.pinCode, undefined);
});

test("services stay hidden until a household name is picked or guest details are complete", () => {
  assert.equal(bookingReadyForService({}, profile), false);
  assert.equal(bookingReadyForService({ bookedFor: "self" }, profile), true);
  assert.equal(bookingReadyForService({ bookedFor: "fam-1" }, profile), true);
  assert.equal(bookingReadyForService({ bookedFor: "other" }, profile), false);
  assert.equal(bookingReadyForService({}, {}), false);
  assert.equal(
    bookingReadyForService(
      {
        bookedFor: "other",
        patientName: "Guest Person",
        gender: "F",
        age: "30",
        mobile: "9876501234",
        houseNo: "1",
        society: "Park",
        pinCode: "122006",
        area: "Sector 14",
        city: "Gurugram",
        district: "Gurugram",
        state: "Haryana",
        addressConfirmed: "yes",
      },
      profile
    ),
    true
  );
});

test("Male/Female is asked only for guests or Someone Else", () => {
  assert.equal(hasHouseholdProfile(profile), true);
  assert.equal(shouldAskBookingDetails({ bookedFor: "self" }, profile), false);
  assert.equal(shouldAskBookingDetails({ bookedFor: "fam-1" }, profile), false);
  assert.equal(shouldAskBookingDetails({ bookedFor: "other" }, profile), true);
  assert.equal(shouldAskBookingDetails({}, {}), true);
  assert.equal(validateBookingDetails({ bookedFor: "self" }, profile).gender, undefined);
  assert.equal(
    validateBookingDetails({ bookedFor: "other" }, profile).gender,
    "Select Male or Female."
  );
});
