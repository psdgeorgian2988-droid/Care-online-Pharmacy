import test from "node:test";
import assert from "node:assert/strict";
import {
  groupByTrackStatus,
  isUnassigned,
  matchesStatusFilter,
  nextTrackStep,
  statusMatrix,
  trackKey,
} from "./orderStatus.js";

const orders = [
  { id: "1", kind: "medicine", trackStatus: "confirmed" },
  { id: "2", kind: "lab", trackStatus: "assigned", partnerId: "p1" },
  { id: "3", kind: "homecare", trackStatus: "on_the_way", partnerId: "p2" },
  { id: "4", kind: "ambulance", trackStatus: "arriving", partnerId: "p3" },
  { id: "5", kind: "medicine", trackStatus: "done", partnerId: "p4" },
  { id: "6", kind: "stepdown", trackCompleted: true },
  { id: "7", kind: "radiology" },
];

test("trackKey treats missing and completed flags as pipeline steps", () => {
  assert.equal(trackKey(orders[0]), "confirmed");
  assert.equal(trackKey(orders[5]), "done");
  assert.equal(trackKey(orders[6]), "confirmed");
  assert.equal(nextTrackStep("confirmed"), "assigned");
  assert.equal(nextTrackStep("done"), "done");
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
  assert.equal(groupByTrackStatus(orders).confirmed.length, 2);
});
