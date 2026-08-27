import test from "node:test";
import assert from "node:assert/strict";
import { holdForPartnerQueue, kindFromRecord, partnerTraffic } from "./partnerQueue.js";

const orders = [
  { kind: "lab", trackStatus: "confirmed" },
  { kind: "lab", trackStatus: "assigned" },
  { kind: "homecare", trackStatus: "done" },
];

test("two open jobs of the same kind count as high partner traffic", () => {
  const traffic = partnerTraffic("lab", orders, Date.parse("2026-08-27T04:00:00+05:30"));
  assert.equal(traffic.busy, true);
  assert.equal(traffic.openCount, 2);
});

test("home care bookings stored with a nurse plan still count as homecare traffic", () => {
  assert.equal(kindFromRecord({ serviceType: "nurse" }, "homecare"), "homecare");
  const traffic = partnerTraffic(
    "homecare",
    [{ kind: "homecare", trackStatus: "confirmed" }],
    Date.parse("2026-08-27T04:00:00+05:30")
  );
  assert.equal(traffic.openCount, 1);
  assert.equal(traffic.busy, true);
});

test("a quiet off-peak service is not held", async () => {
  const queued = await holdForPartnerQueue(
    "homecare",
    {},
    orders,
    Date.parse("2026-08-27T04:00:00+05:30")
  );
  assert.equal(queued.busy, false);
  assert.equal(queued.waited, false);
});

test("urgent ambulance is not held even at peak", async () => {
  const queued = await holdForPartnerQueue(
    "ambulance",
    { urgent: true },
    [{ kind: "ambulance", trackStatus: "confirmed" }, { kind: "ambulance", trackStatus: "on_the_way" }],
    Date.parse("2026-08-27T19:00:00+05:30")
  );
  assert.equal(queued.waited, false);
});
