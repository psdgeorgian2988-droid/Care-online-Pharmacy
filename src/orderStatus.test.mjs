import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_SERVICE_TABS,
  CUSTOMER_SERVICE_TABS,
  countOrdersForAdminTab,
  countOrdersForCustomerTab,
  groupByTrackStatus,
  groupOrdersByKind,
  completedOrders,
  isCompletedOrder,
  isCustomerServiceTab,
  isOpenOrder,
  isPartnerEnRoute,
  isUnassigned,
  matchesStatusFilter,
  nextTrackStep,
  ordersForCustomerTab,
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

test("completed orders are done only, not open or declined", () => {
  assert.equal(isCompletedOrder(orders[0]), false);
  assert.equal(isCompletedOrder(orders[4]), true);
  assert.equal(isCompletedOrder(orders[5]), true);
  assert.equal(isCompletedOrder({ kind: "lab", trackStatus: "declined" }), false);
  assert.equal(completedOrders(orders).map((row) => row.id).join(","), "5,6");
});

test("map tracking starts only after the partner is heading to the customer", () => {
  assert.equal(isPartnerEnRoute({ kind: "lab", trackStatus: "requested" }), false);
  assert.equal(
    isPartnerEnRoute({
      kind: "lab",
      trackStatus: "confirmed",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
    }),
    false
  );
  assert.equal(
    isPartnerEnRoute({
      kind: "lab",
      trackStatus: "assigned",
      partnerId: "p1",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
    }),
    false
  );
  assert.equal(
    isPartnerEnRoute({
      kind: "lab",
      trackStatus: "assigned",
      trackStartedAt: 1,
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
    }),
    true
  );
  assert.equal(
    isPartnerEnRoute({
      kind: "medicine",
      trackStatus: "on_the_way",
      checkPickupAt: 1,
      partnerConfirmed: true,
      partnerConfirmStatus: "auto",
    }),
    true
  );
});

test("isOpenOrder is the ongoing-vs-stop rule for live tracking", () => {
  assert.equal(isOpenOrder(orders[0]), true);
  assert.equal(isOpenOrder(orders[2]), true);
  assert.equal(isOpenOrder({ kind: "lab", trackStatus: "report_ready", partnerConfirmed: true, partnerConfirmStatus: "accepted" }), true);
  assert.equal(isOpenOrder({ kind: "medicine", trackStatus: "done", trackCompleted: true }), false);
  assert.equal(isOpenOrder({ kind: "lab", trackStatus: "done", trackCompleted: true }), false);
  assert.equal(isOpenOrder({ kind: "lab", trackStatus: "declined" }), false);
  assert.equal(isOpenOrder({ kind: "stepdown", trackStatus: "cancelled" }), false);
  assert.equal(isOpenOrder({ kind: "medicine", trackCompleted: true }), false);
});

test("status filters isolate open, unassigned, and a single step", () => {
  assert.equal(orders.filter((row) => matchesStatusFilter(row, "open")).length, 5);
  assert.equal(orders.filter((row) => isUnassigned(row)).length, 2);
  assert.equal(orders.filter((row) => matchesStatusFilter(row, "progress")).length, 3);
  assert.equal(groupByTrackStatus(orders).confirmed.length, 1);
  assert.equal(groupByTrackStatus(orders).requested.length, 1);
});

test("customer service tabs keep completed orders in that category", () => {
  assert.deepEqual(
    CUSTOMER_SERVICE_TABS.map((tab) => tab.value),
    [
      "medicine",
      "lab",
      "radiology",
      "homecare",
      "vaccination",
      "doctor",
      "psychologist",
      "stepdown",
      "ambulance",
    ]
  );
  assert.deepEqual(
    CUSTOMER_SERVICE_TABS.map((tab) => tab.label),
    [
      "Medicine order",
      "Lab order",
      "Imaging centre order",
      "Home Care",
      "Vaccination",
      "Doctor",
      "Psychologist",
      "Step-Down",
      "Ambulance",
    ]
  );
  assert.equal(isCustomerServiceTab(""), false);
  assert.equal(isCustomerServiceTab("all"), false);
  assert.equal(ordersForCustomerTab(orders, "").length, 0);
  assert.deepEqual(
    ordersForCustomerTab(orders, "medicine").map((row) => row.id),
    ["1", "5"]
  );
  assert.equal(countOrdersForCustomerTab(orders, "medicine"), 2);
  assert.equal(
    ordersForCustomerTab(orders, "medicine").some((row) => isCompletedOrder(row)),
    true
  );
  assert.equal(ordersForCustomerTab(orders, "stepdown")[0].id, "6");
  assert.equal(isCompletedOrder(ordersForCustomerTab(orders, "stepdown")[0]), true);
});

test("admin service tabs list every partner category", () => {
  assert.deepEqual(
    ADMIN_SERVICE_TABS.map((tab) => tab.value),
    [
      "all",
      "medicine",
      "lab",
      "radiology",
      "homecare",
      "vaccination",
      "doctor",
      "psychologist",
      "stepdown",
      "ambulance",
      "refund",
    ]
  );
  assert.equal(countOrdersForAdminTab(orders, "all"), 7);
  assert.equal(countOrdersForAdminTab(orders, "lab"), 1);
  assert.equal(countOrdersForAdminTab(orders, "medicine"), 2);
  assert.equal(
    countOrdersForAdminTab(
      [...orders, { id: "r1", kind: "medicine", refundStatus: "pending" }],
      "refund"
    ),
    1
  );
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

test("staff desk categories cover every partner service", () => {
  const all = groupOrdersByKind(
    [
      { id: "m", kind: "medicine" },
      { id: "l", kind: "lab" },
      { id: "r", kind: "radiology" },
      { id: "h", kind: "homecare" },
      { id: "v", kind: "vaccination" },
      { id: "p", kind: "psychologist" },
      { id: "d", kind: "doctor" },
      { id: "s", kind: "stepdown" },
      { id: "a", kind: "ambulance" },
    ]
  );
  assert.deepEqual(
    all.map((row) => row.kind),
    [
      "medicine",
      "lab",
      "radiology",
      "homecare",
      "vaccination",
      "psychologist",
      "doctor",
      "stepdown",
      "ambulance",
    ]
  );
  assert.ok(all.every((row) => row.orders.length === 1));
});
