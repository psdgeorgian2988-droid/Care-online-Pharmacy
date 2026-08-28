import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SELF_BOOKING_ID,
  bookingForOptions,
  bookingForPatch,
  bookingForSelectLabel,
  findBookingFor,
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

test("dropdown lists Self then each family member name only", () => {
  const options = bookingForOptions(profile);
  assert.deepEqual(
    options.map((row) => bookingForSelectLabel(row)),
    ["Self", "Aarav Sharma", "Riya Sharma"]
  );
  assert.equal(options[0].id, SELF_BOOKING_ID);
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
