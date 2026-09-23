import test from "node:test";
import assert from "node:assert/strict";
import {
  orderAssignedLabel,
  orderLineItems,
  orderOutletLabel,
  orderPartnerAssignment,
  orderPaymentModeLabel,
  orderPaymentSummary,
  orderSlotLines,
  orderTrackLabel,
} from "./orderFullFields.js";

const labOrder = {
  kind: "lab",
  tests: [
    { name: "CBC", price: 250, quantity: 1 },
    { name: "KFT", price: 600 },
  ],
  patientName: "Guest",
  mobile: "8287119947",
  deliveryAddress: "f405, Palam Vihar",
  pinCode: "122017",
  requestedDate: "2026-09-22",
  requestedTimeSlot: "2:00 PM - 4:00 PM",
  date: "2026-09-22",
  timeSlot: "2:00 PM - 4:00 PM",
  paymentMethod: "cod",
  paymentStatus: "cod",
  total: 1840,
  partnerConfirmed: false,
  partnerConfirmStatus: "pending",
  split: {
    platformPercent: 25,
    partnerPercent: 75,
    platformRupees: 530,
    partnerRupees: 1698,
    saleRupees: 2264,
    payableRupees: 2228,
  },
};

test("orderLineItems falls back from tests when items are missing", () => {
  const lines = orderLineItems(labOrder);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].name, "CBC");
  assert.equal(orderLineItems({ carePlanLabel: "Nurse visit", total: 900 })[0].name, "Nurse visit");
});

test("customer and partner payment summaries hide split percent", () => {
  const customer = orderPaymentSummary(labOrder, "customer");
  const partner = orderPaymentSummary(labOrder, "partner");
  assert.equal(customer.showSplit, false);
  assert.equal(partner.showSplit, false);
  assert.equal(customer.platformPercent, null);
  assert.equal(partner.partnerPercent, null);
});

test("staff payment summary keeps split percent for ops", () => {
  const staff = orderPaymentSummary(labOrder, "staff");
  assert.equal(staff.showSplit, true);
  assert.equal(staff.platformPercent, 25);
  assert.equal(staff.partnerPercent, 75);
});

test("partner assignment stays hidden until a partner is on the order", () => {
  assert.equal(orderPartnerAssignment(labOrder).assigned, false);
  assert.equal(
    orderPartnerAssignment({ ...labOrder, partnerId: "pathcare", partner: "Pathcare" }).assigned,
    true
  );
});

test("slot lines expose requested and current appointment", () => {
  const slots = orderSlotLines(labOrder);
  assert.equal(slots.requested, "2026-09-22 · 2:00 PM - 4:00 PM");
  assert.match(slots.label, /2:00 PM - 4:00 PM/);
});

test("Lab Update is replaced by the order current status", () => {
  assert.equal(
    orderTrackLabel({
      kind: "lab",
      status: "Lab Update",
      trackStatus: "sample_collected",
    }),
    "Sample Collected"
  );
  assert.equal(
    orderTrackLabel({
      kind: "lab",
      status: "Imaging Update",
      trackStatus: "confirmed",
    }),
    "Partner Accepted"
  );
});

test("list row labels stay compact", () => {
  assert.equal(orderOutletLabel({ ...labOrder, outletName: "Gurugram Outlet" }), "Gurugram Outlet");
  assert.equal(orderAssignedLabel(labOrder), "Unassigned");
  assert.equal(orderPaymentModeLabel(labOrder, "partner"), "After partner acceptance");
});
