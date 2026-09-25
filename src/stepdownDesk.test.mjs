import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STEPDOWN_DESK_TABS,
  STEPDOWN_LIST_TABS,
  STEPDOWN_PAY_OPTIONS,
  downloadStepdownDocument,
  ordersForStepdownListTab,
  printStepdownDocument,
  stepdownAdmitFields,
  stepdownDischargeFields,
  stepdownCareType,
  stepdownContactDetails,
  stepdownDays,
  stepdownDocument,
  stepdownListTab,
  stepdownPatientName,
} from "./stepdownDesk.js";

test("new bookings sit in New Booking until confirm, then accepted, then admitted, then discharged", () => {
  assert.deepEqual(
    STEPDOWN_LIST_TABS.map((tab) => tab.id),
    ["new", "accepted", "admitted", "discharged"]
  );
  const fresh = { bookingId: "MH-SD-1", partnerConfirmStatus: "pending" };
  const accepted = { bookingId: "MH-SD-2", partnerConfirmStatus: "accepted" };
  const admitted = {
    bookingId: "MH-SD-3",
    ...stepdownAdmitFields({ bookingId: "MH-SD-3" }, { roomNo: "12", bedNo: "B-1" }),
  };
  const discharged = {
    bookingId: "MH-SD-4",
    ...stepdownAdmitFields({ bookingId: "MH-SD-4" }, { roomNo: "8", bedNo: "A-2" }),
    ...stepdownDischargeFields(),
  };
  assert.equal(stepdownListTab(fresh), "new");
  assert.equal(stepdownListTab(accepted), "accepted");
  assert.equal(stepdownListTab(admitted), "admitted");
  assert.equal(stepdownListTab(discharged), "discharged");
  assert.deepEqual(
    ordersForStepdownListTab([fresh, accepted, admitted, discharged], "new").map((row) => row.bookingId),
    ["MH-SD-1"]
  );
});

test("step-down desk includes patient, contact, attendant, care, days, discharge, and prescription tabs", () => {
  assert.deepEqual(
    STEPDOWN_DESK_TABS.map((tab) => tab.id),
    ["patient", "contact", "attendant", "care", "days", "discharge", "prescription"]
  );
});

test("patient tab uses the booking name", () => {
  assert.equal(stepdownPatientName({ patientName: "Anita Verma" }), "Anita Verma");
  assert.equal(stepdownPatientName({}), "Name not given");
});

test("contact tab keeps only the mobile number", () => {
  const contact = stepdownContactDetails({
    bookingId: "MH-SD-100001",
    patientName: "Anita Verma",
    mobile: "9876543210",
    houseNo: "12",
    society: "Sector 12",
    area: "Dwarka",
    city: "New Delhi",
    pinCode: "110075",
    email: "anita@example.com",
  });
  assert.equal(contact.mobile, "9876543210");
  assert.equal(contact.address, undefined);
  assert.equal(contact.pin, undefined);
  assert.equal(contact.email, undefined);
});

test("type of care tab uses the booked recovery type", () => {
  assert.equal(
    stepdownCareType({ serviceLabel: "Post-ICU step-down" }),
    "Post-ICU step-down"
  );
  assert.equal(stepdownCareType({ serviceType: "rehab" }), "Rehab & physiotherapy");
  assert.equal(stepdownCareType({}), "Care type not given");
});

test("discharge summary and prescription tabs read uploaded files", () => {
  const order = {
    bookingId: "MH-SD-100001",
    dischargeSummaryName: "icu-discharge.pdf",
    dischargeSummaryFile: "data:application/pdf;base64,AAA",
    prescriptionName: "rx.jpg",
    prescriptionFile: "data:image/jpeg;base64,BBB",
  };
  assert.equal(stepdownDocument(order, "discharge").name, "icu-discharge.pdf");
  assert.equal(stepdownDocument(order, "prescription").name, "rx.jpg");
});

test("print is only available when a file is attached", () => {
  assert.equal(printStepdownDocument({ href: "" }, "prescription"), false);
  assert.equal(downloadStepdownDocument({ href: "" }, "prescription"), false);
});

test("no of days tab uses the booked stay length", () => {
  assert.equal(stepdownDays({ durationDays: 7 }), "7");
  assert.equal(stepdownDays({}), "");
});

test("discharge finalizes the complete bill and accepts cash, QR, or UPI", () => {
  assert.deepEqual(
    STEPDOWN_PAY_OPTIONS.map((row) => row.label),
    ["Cash", "QR Code", "UPI"]
  );
  const order = {
    kind: "stepdown",
    bookingId: "MH-SD-9",
    durationDays: 7,
    dayRate: 4999,
    date: "2026-09-24",
  };
  const fields = stepdownDischargeFields(order, { paymentMethod: "upi", paid: true });
  assert.equal(fields.discharged, true);
  assert.equal(fields.trackStatus, "discharged");
  assert.equal(fields.billFinalized, true);
  assert.equal(fields.total, 7 * 4999);
  assert.equal(fields.paid, true);
  assert.equal(fields.paymentMethod, "upi");
  assert.equal(fields.paymentStatus, "paid");
  assert.equal(fields.status, "Discharged · Paid");
  assert.ok(fields.headingTotals.some((row) => row.label === "Room rent"));
  assert.equal(fields.billLines[0].name, "Room rent");
  assert.equal(fields.billLines[0].detail, "2026-09-24 to 2026-09-30");
});
