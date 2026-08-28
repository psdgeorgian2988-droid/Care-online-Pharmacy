import test from "node:test";
import assert from "node:assert/strict";
import { guestDraftFromOrder, missingGuestRegisterFields } from "./guestOrder.js";

test("guest draft reuses order name, mobile and address", () => {
  const draft = guestDraftFromOrder({
    patientName: "Anita Sharma",
    mobile: "9876543210",
    houseNo: "12",
    society: "Green Park",
    pinCode: "122006",
    area: "Sector 14",
    city: "Gurugram",
    district: "Gurugram",
    state: "Haryana",
    addressConfirmed: "yes",
  });
  assert.equal(draft.name, "Anita Sharma");
  assert.equal(draft.mobile, "9876543210");
  assert.equal(draft.pinCode, "122006");
  assert.equal(draft.houseNo, "12");
});

test("complete guest order still needs gender and date of birth to register", () => {
  const { missing } = missingGuestRegisterFields({
    name: "Anita Sharma",
    mobile: "9876543210",
    houseNo: "12",
    society: "Green Park",
    pinCode: "122006",
    area: "Sector 14",
    city: "Gurugram",
    district: "Gurugram",
    state: "Haryana",
  });
  assert.deepEqual(missing.sort(), ["dob", "gender"]);
});

test("name mobile and address are not missing when already on the order", () => {
  const { missing } = missingGuestRegisterFields({
    name: "Anita Sharma",
    mobile: "9876543210",
    gender: "F",
    dob: "1990-01-15",
    houseNo: "12",
    society: "Green Park",
    pinCode: "122006",
    area: "Sector 14",
    city: "Gurugram",
    district: "Gurugram",
    state: "Haryana",
  });
  assert.deepEqual(missing, []);
});
