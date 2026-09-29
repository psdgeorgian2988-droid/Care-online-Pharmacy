import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STEPDOWN_CHARGE_OPTIONS,
  STEPDOWN_DAY_RATE,
  addStepdownCharge,
  createStepdownPatientAccount,
  finalizeStepdownBill,
  stepdownBillLines,
  stepdownBillTotal,
  stepdownChargeLabel,
  stepdownHeadingTotals,
} from "./stepdownBill.js";
import { stepdownAdmitFields } from "./stepdownDesk.js";

test("step-down bill headings include room rent, doctor visit, consumables, dressing and other", () => {
  const labels = STEPDOWN_CHARGE_OPTIONS.map((row) => row.label);
  assert.ok(labels.includes("Room rent"));
  assert.ok(labels.includes("Doctor visit"));
  assert.ok(labels.includes("Consumables"));
  assert.ok(labels.includes("Dressing"));
  assert.ok(labels.includes("Other"));
});

test("room rent uses the booking-time day rate and number of days", () => {
  const order = { bookingId: "MH-SD-9", durationDays: 7, dayRate: 4999 };
  const result = addStepdownCharge(order, {
    service: "room-rent",
    days: 2,
    rate: 999,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.lastCharge.rate, STEPDOWN_DAY_RATE);
  assert.equal(result.lastCharge.qty, 2);
  assert.equal(result.lastCharge.amount, 9998);
  assert.equal(stepdownChargeLabel("room-rent", "", 2), "Room rent (2 days)");
  assert.equal(stepdownBillTotal({ ...order, stayCharges: result.stayCharges }), 7 * 4999 + 9998);
});

test("front page groups by heading; detail keeps extra room rent on one line and services by day", () => {
  const extra = addStepdownCharge(
    { bookingId: "MH-SD-9", durationDays: 7, dayRate: 4999, date: "2026-09-24" },
    { service: "room-rent", days: 2 }
  );
  const visit = addStepdownCharge(
    { bookingId: "MH-SD-9", durationDays: 7, dayRate: 4999, date: "2026-09-24", stayCharges: extra.stayCharges },
    { service: "doctor-visit", rate: 800, date: "2026-09-25" }
  );
  const medicine = addStepdownCharge(
    { bookingId: "MH-SD-9", durationDays: 7, dayRate: 4999, date: "2026-09-24", stayCharges: visit.stayCharges },
    {
      service: "medicine",
      rate: 450,
      date: "2026-09-26",
      billFileName: "med-bill.pdf",
      billFileData: "data:application/pdf;base64,AAA",
    }
  );
  const order = {
    bookingId: "MH-SD-9",
    durationDays: 7,
    dayRate: 4999,
    date: "2026-09-24",
    stayCharges: medicine.stayCharges,
  };
  const headings = stepdownHeadingTotals(order);
  assert.deepEqual(
    headings.map((row) => row.label),
    ["Room rent", "Doctor visit", "Medicine"]
  );
  assert.equal(headings[0].amount, 7 * 4999 + 9998);
  const lines = stepdownBillLines(order);
  assert.equal(lines[0].name, "Room rent");
  assert.equal(lines[0].detail, "2026-09-24 to 2026-09-30");
  assert.equal(lines[1].name, "Room rent");
  assert.equal(lines[1].detail, "2026-10-01 to 2026-10-02");
  assert.equal(lines[2].name, "Doctor visit");
  assert.equal(lines[2].detail, "2026-09-25");
  assert.equal(lines[3].name, "Medicine");
  assert.equal(lines[3].detail, "2026-09-26");
  assert.equal(lines[3].billFileName, "med-bill.pdf");
  assert.equal(addStepdownCharge(order, { service: "medicine", rate: 100 }).error, "Attach the medicine bill.");
});

test("admit opens a patient account", () => {
  const fields = stepdownAdmitFields(
    { bookingId: "MH-SD-982526", patientName: "Anita", mobile: "9876543210" },
    { roomNo: "12", bedNo: "B-1" }
  );
  const account = createStepdownPatientAccount({ bookingId: "MH-SD-982526" });
  assert.equal(fields.patientAccountId, account.patientAccountId);
  assert.equal(fields.patientAccountOpened, true);
});

test("finalize locks heading totals and the stay amount", () => {
  const order = { bookingId: "MH-SD-9", durationDays: 7, dayRate: 4999, date: "2026-09-24" };
  const bill = finalizeStepdownBill(order, { paymentMethod: "cod", paid: true });
  assert.equal(bill.billFinalized, true);
  assert.equal(bill.total, 7 * 4999);
  assert.equal(bill.paid, true);
  assert.equal(bill.headingTotals[0].label, "Room rent");
});
