import test from "node:test";
import assert from "node:assert/strict";
import {
  groupByTrackStatus,
  groupOrdersByKind,
  isUnassigned,
  matchesStatusFilter,
  nextTrackStep,
  serviceKind,
  statusMatrix,
  trackKey,
} from "./orderStatus.js";

const orders = [
  { id: "1", kind: "medicine", trackStatus: "confirmed", partnerConfirmed: true, partnerConfirmStatus: "auto" },
  {
    id: "2",
    kind: "lab",
    trackStatus: "assigned",
    partnerId: "p1",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
  },
  {
    id: "3",
    kind: "homecare",
    trackStatus: "on_the_way",
    partnerId: "p2",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
  },
  {
    id: "4",
    kind: "ambulance",
    trackStatus: "arriving",
    partnerId: "p3",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
  },
  { id: "5", kind: "medicine", trackStatus: "done", partnerId: "p4", partnerConfirmed: true, partnerConfirmStatus: "auto" },
  { id: "6", kind: "stepdown", trackCompleted: true, partnerConfirmed: true, partnerConfirmStatus: "accepted" },
  { id: "7", kind: "radiology" },
];

test("trackKey treats missing and completed flags as pipeline steps", () => {
  assert.equal(trackKey(orders[0]), "confirmed");
  assert.equal(trackKey(orders[5]), "done");
  assert.equal(trackKey(orders[6]), "requested");
  assert.equal(nextTrackStep("confirmed"), "assigned");
  assert.equal(nextTrackStep("done"), "done");
});

test("partner kinds without accept stay requested even if status says confirmed", () => {
  assert.equal(
    trackKey({ kind: "lab", trackStatus: "confirmed" }),
    "requested"
  );
  assert.equal(
    trackKey({
      kind: "lab",
      trackStatus: "confirmed",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
    }),
    "confirmed"
  );
});

test("status matrix counts every service across the pipeline", () => {
  const matrix = statusMatrix(orders);
  assert.equal(matrix.total, 7);
  assert.equal(matrix.open, 5);
  assert.equal(matrix.done, 2);
  assert.equal(matrix.unassigned, 2);
  assert.equal(matrix.inProgress, 3);
  const medicine = matrix.byKind.find((row) => row.kind === "medicine");
  assert.equal(medicine.confirmed, 1);
  assert.equal(medicine.done, 1);
  assert.equal(medicine.open, 1);
});

test("status filters isolate open, unassigned, and a single step", () => {
  assert.equal(orders.filter((row) => matchesStatusFilter(row, "open")).length, 5);
  assert.equal(orders.filter((row) => isUnassigned(row)).length, 2);
  assert.equal(orders.filter((row) => matchesStatusFilter(row, "progress")).length, 3);
  assert.equal(groupByTrackStatus(orders).confirmed.length, 1);
  assert.equal(groupByTrackStatus(orders).requested.length, 1);
});

test("cart checkout orders sit with pharmacy, and lists group by service", () => {
  assert.equal(serviceKind({ kind: "cart" }), "medicine");
  const groups = groupOrdersByKind(
    [...orders, { id: "c1", kind: "cart" }],
    ["medicine", "lab"]
  );
  assert.equal(groups[0].title, "Pharmacy orders");
  assert.equal(groups[0].orders.length, 3);
  assert.equal(groups[1].title, "Lab test orders");
  assert.equal(groups[1].orders.length, 1);
});
