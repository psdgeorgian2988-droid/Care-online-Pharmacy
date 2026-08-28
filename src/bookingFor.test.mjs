import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OTHER_BOOKING_ID,
  SELF_BOOKING_ID,
  bookingForOptions,
  bookingForPatch,
  bookingForSelectLabel,
  findBookingFor,
  shouldAskBookingContact,
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

test("dropdown lists Self, each family member, then Someone Else", () => {
  const options = bookingForOptions(profile);
  assert.deepEqual(
    options.map((row) => bookingForSelectLabel(row)),
    ["Self", "Aarav Sharma", "Riya Sharma", "Someone Else"]
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

test("Someone Else clears contact so address and mobile are asked again", () => {
  const option = findBookingFor(profile, OTHER_BOOKING_ID);
  const patch = bookingForPatch(option, profile);
  assert.equal(patch.bookedFor, OTHER_BOOKING_ID);
  assert.equal(patch.patientName, "");
  assert.equal(patch.mobile, "");
  assert.equal(patch.pinCode, "");
  assert.equal(shouldAskBookingContact(patch, profile), true);
  assert.equal(shouldAskBookingContact({ bookedFor: "self" }, profile), false);
  assert.equal(shouldAskBookingContact({ bookedFor: "fam-1" }, profile), false);
});
