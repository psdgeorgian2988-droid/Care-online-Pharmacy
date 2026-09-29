import test from "node:test";
import assert from "node:assert/strict";
import {
  customerPaymentModeLabel,
  formatOrderMobile,
  isCustomerCompletedDetail,
  orderAssignedLabel,
  orderKindExtras,
  orderLineItems,
  orderOutletLabel,
  orderPartnerAssignment,
  orderPaymentModeLabel,
  orderPaymentSummary,
  orderSlotLines,
  orderTrackLabel,
  showOrderPartnerBlock,
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

test("only the pharmacy partner desk hides the customer mobile", () => {
  assert.equal(formatOrderMobile("9876543210", "partner", "medicine"), "987****210");
  assert.equal(formatOrderMobile("9876543210", "partner", "lab"), "9876543210");
  assert.equal(formatOrderMobile("9876543210", "partner", "doctor"), "9876543210");
  assert.equal(formatOrderMobile("9876543210", "staff", "medicine"), "9876543210");
});

test("lab report extras open the file instead of a blank href", () => {
  const extras = orderKindExtras({
    ...labOrder,
    reportFileName: "cbc.pdf",
    reportFileData: "data:application/pdf;base64,aaa",
  });
  const report = extras.find((row) => row.label === "Report");
  assert.equal(report.openFile, true);
  assert.equal(report.href, undefined);
  assert.equal(report.value, "CBC, KFT.pdf");
});

test("partner-collected COD payment is the same for customer, partner, and staff", () => {
  const collected = {
    ...labOrder,
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
    paymentMethod: "upi",
    paymentStatus: "paid",
    paid: true,
    paidOn: "partner",
    collector: "partner",
  };
  const customer = orderPaymentSummary(collected, "customer");
  const partner = orderPaymentSummary(collected, "partner");
  const staff = orderPaymentSummary(collected, "staff");
  assert.equal(customer.paid, true);
  assert.equal(partner.paid, true);
  assert.equal(staff.paid, true);
  assert.match(customer.methodText, /UPI/i);
  assert.match(partner.methodText, /UPI/i);
  assert.match(staff.methodText, /UPI/i);
  assert.match(customer.statusText, /collected by partner/i);
  assert.match(partner.statusText, /collected by partner/i);
  assert.match(staff.statusText, /collected by partner/i);
  const cash = orderPaymentSummary(
    { ...collected, paymentMethod: "cod" },
    "customer"
  );
  assert.equal(cash.paid, true);
  assert.match(cash.methodText, /cash/i);
  assert.match(cash.statusText, /Paid/i);
});

test("list row labels stay compact", () => {
  assert.equal(orderOutletLabel({ ...labOrder, outletName: "Gurugram Outlet" }), "Gurugram Outlet");
  assert.equal(orderAssignedLabel(labOrder), "Unassigned");
  assert.equal(orderPaymentModeLabel(labOrder, "partner"), "After partner acceptance");
});

const completedLab = {
  ...labOrder,
  id: "LAB-DONE-1",
  trackStatus: "done",
  trackCompleted: true,
  partnerId: "pathcare",
  partner: "Pathcare",
  partnerName: "Ravi Lab",
  partnerMobile: "9000000001",
  technicianName: "Ravi Lab",
  technicianMobile: "9000000001",
  partnerGstin: "06AAAAA0000A1Z5",
  paymentMethod: "upi",
  paymentStatus: "paid",
  paid: true,
};

test("customer completed detail is date, number, items, and payment only", () => {
  assert.equal(isCustomerCompletedDetail(completedLab, "customer"), true);
  assert.equal(isCustomerCompletedDetail(labOrder, "customer"), false);
  assert.equal(isCustomerCompletedDetail(completedLab, "partner"), false);
  assert.equal(showOrderPartnerBlock(completedLab, "customer"), false);
  assert.equal(showOrderPartnerBlock(labOrder, "customer"), false);
  assert.equal(
    showOrderPartnerBlock({ ...labOrder, partnerId: "pathcare", partnerName: "Ravi" }, "customer"),
    true
  );
  assert.equal(showOrderPartnerBlock(completedLab, "partner"), true);
  assert.equal(showOrderPartnerBlock(completedLab, "staff"), true);
});

test("customer completed extras drop partner and in-charge rows", () => {
  const extras = orderKindExtras(completedLab, "customer");
  assert.equal(
    extras.some((row) => /partner|in-charge|gstin|licence|assigned/i.test(row.label)),
    false
  );
  const partnerExtras = orderKindExtras(completedLab, "partner");
  assert.equal(partnerExtras.some((row) => row.label === "Lab Partner"), true);
});

test("customer payment mode maps cash, UPI, card, QR, and bank", () => {
  assert.equal(customerPaymentModeLabel({ paymentMethod: "cod" }), "Cash");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "cash" }), "Cash");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "upi" }), "UPI");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "qr" }), "QR");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "card" }), "Card");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "debit" }), "Card");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "credit" }), "Credit Card");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "card", cardFunding: "credit" }), "Credit Card");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "card", cardFunding: "debit" }), "Card");
  assert.equal(customerPaymentModeLabel({ paymentMethod: "bank" }), "Bank");
  assert.doesNotMatch(customerPaymentModeLabel(completedLab), /%/);
  const customerPay = orderPaymentSummary(completedLab, "customer");
  assert.equal(customerPay.showSplit, false);
});
