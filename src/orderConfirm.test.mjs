import test from "node:test";
import assert from "node:assert/strict";
import {
  checkMedicineAvailability,
  initialOrderStatus,
  medicineConfirmedFields,
  needsPartnerConfirm,
  partnerAcceptFields,
  partnerDeclineFields,
} from "./orderConfirm.js";

test("lab and other tests need partner confirmation", () => {
  assert.equal(needsPartnerConfirm("lab"), true);
  assert.equal(needsPartnerConfirm("radiology"), true);
  assert.equal(needsPartnerConfirm("homecare"), true);
  assert.equal(needsPartnerConfirm("medicine"), false);
  assert.equal(initialOrderStatus("lab").trackStatus, "requested");
  assert.equal(initialOrderStatus("medicine").trackStatus, "confirmed");
});

test("medicine confirms only when catalogue has the cart items", () => {
  const catalogue = [
    { id: "1", name: "MediHome Aspirin 75 mg" },
    { id: "2", name: "MediHome Metformin 500 mg", stockQty: 2 },
  ];
  assert.equal(
    checkMedicineAvailability([{ id: "1", name: "Aspirin", quantity: 1 }], catalogue).ok,
    true
  );
  assert.equal(
    checkMedicineAvailability([{ id: "9", name: "Missing", quantity: 1 }], catalogue).ok,
    false
  );
  assert.equal(
    checkMedicineAvailability([{ id: "2", name: "Metformin", quantity: 5 }], catalogue).ok,
    false
  );
  const confirmed = medicineConfirmedFields(
    checkMedicineAvailability([{ id: "1", name: "Aspirin", quantity: 1 }], catalogue)
  );
  assert.equal(confirmed.trackStatus, "confirmed");
  assert.equal(confirmed.availabilityChecked, true);
});

test("partner accept and decline patches", () => {
  assert.equal(partnerAcceptFields().trackStatus, "confirmed");
  assert.equal(partnerAcceptFields().partnerConfirmStatus, "accepted");
  assert.equal(partnerDeclineFields().trackStatus, "declined");
  assert.equal(partnerDeclineFields().trackCompleted, true);
});
