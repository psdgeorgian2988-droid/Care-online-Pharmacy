import test from "node:test";
import assert from "node:assert/strict";
import {
  checkMedicineAvailability,
  customerAcceptSlotFields,
  diagnosticRequestFields,
  initialOrderStatus,
  isAwaitingCustomerSlotConfirm,
  isAwaitingPartnerConfirm,
  medicineConfirmedFields,
  needsPartnerConfirm,
  partnerAcceptFields,
  partnerApproveFields,
  partnerDeclineFields,
  partnerOfferSlotFields,
  radiologyAcceptRequestedSlotFields,
} from "./orderConfirm.js";
import { gatedTrackStatus } from "./orderQr.js";

test("lab and other tests need partner confirmation", () => {
  assert.equal(needsPartnerConfirm("lab"), true);
  assert.equal(needsPartnerConfirm("radiology"), true);
  assert.equal(needsPartnerConfirm("homecare"), true);
  assert.equal(needsPartnerConfirm("medicine"), false);
  assert.equal(initialOrderStatus("lab").trackStatus, "requested");
  assert.equal(initialOrderStatus("medicine").trackStatus, "confirmed");
});

test("partner kinds stay requested until accept even if status was confirmed", () => {
  const pending = {
    kind: "lab",
    trackStatus: "confirmed",
    partnerConfirmed: false,
  };
  assert.equal(isAwaitingPartnerConfirm(pending), true);
  assert.equal(gatedTrackStatus(pending), "requested");
  assert.equal(
    gatedTrackStatus({
      kind: "lab",
      trackStatus: "confirmed",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
    }),
    "confirmed"
  );
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

test("lab is assigned only after the partner approves", () => {
  const approved = partnerApproveFields("lab");
  assert.equal(approved.trackStatus, "assigned");
  assert.equal(approved.partnerConfirmStatus, "accepted");
  assert.equal(initialOrderStatus("lab").trackStatus, "requested");
  assert.equal(initialOrderStatus("lab").partnerConfirmed, false);
});

test("radiology stays unconfirmed until the customer accepts an offered slot", () => {
  const request = diagnosticRequestFields("radiology", {
    date: "2026-10-01",
    timeSlot: "9:00 AM - 11:00 AM",
  });
  assert.equal(request.trackStatus, "requested");
  assert.equal(request.slotConfirmStatus, "pending");
  assert.equal(request.requestedTimeSlot, "9:00 AM - 11:00 AM");

  const offered = partnerOfferSlotFields({
    date: "2026-10-02",
    timeSlot: "2:00 PM - 4:00 PM",
    requestedDate: "2026-10-01",
    requestedTimeSlot: "9:00 AM - 11:00 AM",
  });
  assert.equal(offered.trackStatus, "slot_offered");
  assert.equal(offered.partnerConfirmed, false);
  assert.equal(isAwaitingCustomerSlotConfirm(offered), true);
  assert.equal(isAwaitingPartnerConfirm({ kind: "radiology", ...offered }), false);

  const accepted = customerAcceptSlotFields(offered);
  assert.equal(accepted.partnerConfirmed, true);
  assert.equal(accepted.slotConfirmed, true);
  assert.equal(accepted.timeSlot, "2:00 PM - 4:00 PM");

  const sameSlot = radiologyAcceptRequestedSlotFields({
    requestedDate: "2026-10-01",
    requestedTimeSlot: "9:00 AM - 11:00 AM",
  });
  assert.equal(sameSlot.slotConfirmed, true);
  assert.equal(sameSlot.partnerConfirmed, true);
});

test("psychologist stays unconfirmed until the customer accepts an offered slot", () => {
  const request = diagnosticRequestFields("psychologist", {
    date: "2026-10-03",
    timeSlot: "10:00 AM – 12:00 PM",
  });
  assert.equal(request.trackStatus, "requested");
  assert.equal(request.slotConfirmStatus, "pending");
  const offered = partnerOfferSlotFields({
    date: "2026-10-04",
    timeSlot: "02:00 PM – 04:00 PM",
    requestedDate: request.requestedDate,
    requestedTimeSlot: request.requestedTimeSlot,
  });
  assert.equal(isAwaitingCustomerSlotConfirm(offered), true);
  const accepted = customerAcceptSlotFields({
    ...offered,
    kind: "psychologist",
  });
  assert.equal(accepted.partnerConfirmed, true);
  assert.equal(accepted.status, "Psychologist Confirmed");
  assert.equal(accepted.timeSlot, "02:00 PM – 04:00 PM");
});
