import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeIncomingOrder,
  orderIdKey,
  staffOrderKind,
  trackStatusRank,
} from "./store.mjs";

test("one shared order key ignores kind so admin and partners edit the same row", () => {
  assert.equal(orderIdKey({ kind: "lab", bookingId: "MH-LAB-1" }), "MH-LAB-1");
  assert.equal(orderIdKey({ kind: "medicine", id: "MH-LAB-1" }), "MH-LAB-1");
  assert.equal(staffOrderKind({ kind: "cart" }), "medicine");
  assert.equal(staffOrderKind({ orderType: "homecare" }), "homecare");
  assert.equal(staffOrderKind({ serviceType: "lab" }), "lab");
});

test("stale customer republish cannot roll partner status backward", () => {
  const existing = {
    bookingId: "MH-LAB-9",
    kind: "lab",
    trackStatus: "sample_collected",
    status: "Sample Collected",
    partnerId: "P-LAB-01",
    partnerName: "Neha Sharma",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
  };
  const merged = mergeIncomingOrder(existing, {
    bookingId: "MH-LAB-9",
    kind: "lab",
    trackStatus: "assigned",
    status: "Partner Assigned",
    partnerId: "",
  });
  assert.equal(merged.trackStatus, "sample_collected");
  assert.equal(merged.status, "Sample Collected");
  assert.equal(merged.partnerId, "P-LAB-01");
  assert.equal(merged.partnerName, "Neha Sharma");
});

test("customer cancel and paid still write the shared record", () => {
  const existing = {
    bookingId: "MH-SD-1",
    kind: "stepdown",
    trackStatus: "confirmed",
    status: "Confirmed",
    partnerId: "P-SD-01",
  };
  const cancelled = mergeIncomingOrder(existing, {
    bookingId: "MH-SD-1",
    kind: "stepdown",
    trackStatus: "cancelled",
    status: "Cancelled",
    cancelled: true,
  });
  assert.equal(cancelled.trackStatus, "cancelled");
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.partnerId, "P-SD-01");

  const paid = mergeIncomingOrder(existing, {
    bookingId: "MH-SD-1",
    paid: true,
    paymentStatus: "paid",
    paymentMethod: "upi",
  });
  assert.equal(paid.paid, true);
  assert.equal(paid.paymentStatus, "paid");
  assert.equal(paid.trackStatus, "confirmed");
});

test("track ranks keep lab pipeline ahead of generic assigned", () => {
  assert.ok(trackStatusRank("sample_collected") > trackStatusRank("assigned"));
  assert.ok(trackStatusRank("done") > trackStatusRank("report_ready"));
  assert.equal(trackStatusRank("done"), trackStatusRank("cancelled"));
});
