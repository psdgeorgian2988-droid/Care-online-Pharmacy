import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isRefundOrder,
  refundPendingFields,
  refundStatusLabel,
  refundTrackKey,
  refundUpdateFields,
} from "./refundTrack.js";
import { pharmacyStatusLabel, pharmacyTrackKey } from "./pharmacyTrack.js";

test("refund status is tracked from pending to refunded", () => {
  assert.equal(refundTrackKey({}), "");
  assert.equal(refundTrackKey(refundPendingFields()), "pending");
  assert.equal(refundStatusLabel("pending"), "Refund pending");
  assert.equal(refundStatusLabel("refunded", { refundAmount: 52 }), "Refunded ₹52");
  assert.equal(
    refundTrackKey(refundUpdateFields("processing", { amount: 52 })),
    "processing"
  );
  assert.equal(isRefundOrder({ returnStatus: "requested" }), true);
  assert.equal(isRefundOrder({ refundStatus: "pending" }), true);
  assert.equal(isRefundOrder({ trackStatus: "done" }), false);
});

test("customer and pharmacy status follow the live refund step", () => {
  const order = {
    kind: "medicine",
    trackStatus: "done",
    trackCompleted: true,
    returnStatus: "received",
    refundStatus: "processing",
  };
  assert.equal(pharmacyTrackKey(order), "processing");
  assert.equal(pharmacyStatusLabel(pharmacyTrackKey(order)), "Refund processing");
});
