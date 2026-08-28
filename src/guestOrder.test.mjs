import test from "node:test";
import assert from "node:assert/strict";
import {
  guestDraftFromOrder,
  guestRegisterPlan,
  missingGuestRegisterFields,
} from "./guestOrder.js";

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

test("guest register plan reuses order contact and only asks gender or date of birth if missing", () => {
  const ready = guestRegisterPlan({
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
  assert.equal(ready.canSaveNow, true);
  assert.equal(ready.needsOrderContact, false);
  assert.equal(ready.needsPerson, false);

  const needsDob = guestRegisterPlan({
    patientName: "Anita Sharma",
    mobile: "9876543210",
    houseNo: "12",
    society: "Green Park",
    pinCode: "122006",
    area: "Sector 14",
    city: "Gurugram",
    district: "Gurugram",
    state: "Haryana",
  });
  assert.equal(needsDob.canSaveNow, false);
  assert.equal(needsDob.needsOrderContact, false);
  assert.equal(needsDob.needsPerson, true);
  assert.equal(needsDob.draft.name, "Anita Sharma");
  assert.equal(needsDob.draft.mobile, "9876543210");
  assert.equal(needsDob.draft.pinCode, "122006");
});
