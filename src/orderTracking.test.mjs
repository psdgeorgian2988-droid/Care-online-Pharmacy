import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticCompleteFields } from "./labPipeline.js";
import { pharmacyDeliveredFields, pharmacyPickedUpFields } from "./pharmacyTrack.js";
import { customerMobilesFromOrders } from "./orderSync.js";
import { isOngoingTrackOrder, isOpenOrder, ongoingTrackOrders } from "./orderStatus.js";

const liveMedicine = {
  id: "t-live",
  kind: "medicine",
  trackStatus: "on_the_way",
  trackCompleted: false,
  checkPickupAt: Date.now() - 80000,
  partnerConfirmed: true,
  partnerConfirmStatus: "auto",
};

test("isOngoingTrackOrder matches isOpenOrder: in progress only", () => {
  assert.equal(isOngoingTrackOrder(liveMedicine), true);
  assert.equal(isOngoingTrackOrder(liveMedicine), isOpenOrder(liveMedicine));
  assert.equal(
    isOngoingTrackOrder({
      kind: "lab",
      trackStatus: "requested",
      partnerConfirmed: false,
      partnerConfirmStatus: "pending",
    }),
    true
  );
  assert.equal(
    isOngoingTrackOrder({
      kind: "radiology",
      trackStatus: "requested",
      partnerConfirmed: false,
      partnerConfirmStatus: "pending",
    }),
    true
  );
  assert.equal(
    isOngoingTrackOrder({
      kind: "lab",
      trackStatus: "report_ready",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
    }),
    true
  );
  assert.equal(
    isOngoingTrackOrder({ kind: "medicine", ...pharmacyPickedUpFields() }),
    true
  );
  assert.equal(
    isOngoingTrackOrder({ kind: "medicine", trackStatus: "done", trackCompleted: true }),
    false
  );
  assert.equal(
    isOngoingTrackOrder({ kind: "lab", ...diagnosticCompleteFields() }),
    false
  );
  assert.equal(
    isOngoingTrackOrder({ kind: "medicine", ...pharmacyDeliveredFields() }),
    false
  );
  assert.equal(isOngoingTrackOrder({ kind: "lab", trackStatus: "declined" }), false);
  assert.equal(isOngoingTrackOrder({ kind: "stepdown", trackStatus: "cancelled" }), false);
  assert.equal(isOngoingTrackOrder({ kind: "homecare", trackCompleted: true }), false);
});

test("ongoingTrackOrders drops completed, declined, and cancelled rows", () => {
  const rows = [
    liveMedicine,
    { id: "done", kind: "lab", ...diagnosticCompleteFields() },
    { id: "declined", kind: "lab", trackStatus: "declined" },
    { id: "cancelled", kind: "stepdown", trackStatus: "cancelled" },
    {
      id: "open-lab",
      kind: "lab",
      trackStatus: "assigned",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
    },
  ];
  assert.deepEqual(
    ongoingTrackOrders(rows).map((row) => row.id),
    ["t-live", "open-lab"]
  );
});

test("customer mine sync reads mobiles from orders and the signed-in profile", () => {
  assert.deepEqual(
    customerMobilesFromOrders(
      [
        { id: "1", mobile: "9876543210", kind: "lab" },
        { id: "2", mobileNumber: "98765-43210", kind: "medicine" },
        { id: "3", mobile: "123", kind: "homecare" },
      ],
      { mobile: "9123456789" }
    ),
    ["9876543210", "9123456789"]
  );
});
