import assert from "node:assert/strict";
import { test } from "node:test";
import { alreadyNotified } from "./partnerNotify.mjs";
import { concernedPartnersForOrder } from "./partners.mjs";

const partners = [
  { id: "P-MED-01", kinds: ["medicine"], outletId: "MH-OUT-CD" },
  { id: "P-MED-02", kinds: ["medicine"], outletId: "MH-OUT-SD" },
  { id: "P-LAB-01", kinds: ["lab"], outletId: "MH-OUT-CD" },
  { id: "P-RAD-01", kinds: ["radiology"], outletId: "MH-OUT-SD" },
];

test("notifies the assigned partner only when partnerId matches a login", () => {
  const hit = concernedPartnersForOrder(
    { kind: "lab", partnerId: "P-LAB-01" },
    partners
  );
  assert.deepEqual(
    hit.map((row) => row.id),
    ["P-LAB-01"]
  );
});

test("notifies lab partners for a diagnostic booking without a login id", () => {
  const hit = concernedPartnersForOrder(
    { kind: "lab", partnerId: "pathcare", preferredPartnerId: "pathcare" },
    partners
  );
  assert.deepEqual(
    hit.map((row) => row.id),
    ["P-LAB-01"]
  );
});

test("does not notify a pharmacy partner about a lab booking", () => {
  const hit = concernedPartnersForOrder(
    { kind: "lab" },
    [
      { id: "P-TEST-01", kinds: ["medicine", "lab"] },
      { id: "P-LAB-01", kinds: ["lab"] },
    ]
  );
  assert.deepEqual(
    hit.map((row) => row.id),
    ["P-LAB-01"]
  );
});

test("notifies medicine partners at the order outlet", () => {
  const hit = concernedPartnersForOrder(
    { kind: "medicine", outletId: "MH-OUT-CD" },
    partners
  );
  assert.deepEqual(
    hit.map((row) => row.id),
    ["P-MED-01"]
  );
});

test("does not notify the same partner twice for one order", () => {
  assert.equal(
    alreadyNotified(
      [{ partnerId: "P-LAB-01", orderId: "MH-LAB-1" }],
      "P-LAB-01",
      "MH-LAB-1"
    ),
    true
  );
  assert.equal(
    alreadyNotified(
      [{ partnerId: "P-LAB-01", orderId: "MH-LAB-1" }],
      "P-LAB-01",
      "MH-LAB-2"
    ),
    false
  );
});
