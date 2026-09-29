import test from "node:test";
import assert from "node:assert/strict";
import {
  allocatePointsAcrossServices,
  canRedeemPoints,
  coinsToRupees,
  pointsRedeemAllowedAtCheckout,
  pointsRedeemAllowedForKind,
  pointsRedeemPanel,
  pointsToRupees,
} from "./walletQuote.js";

test("redeem starts only after more than 500 points", () => {
  assert.equal(canRedeemPoints(0), false);
  assert.equal(canRedeemPoints(500), false);
  assert.equal(canRedeemPoints(501), true);
  assert.equal(canRedeemPoints(510), true);
});

test("10 points equal 1 rupee using floor", () => {
  assert.equal(coinsToRupees(10), 1);
  assert.equal(pointsToRupees(510), 51);
  assert.equal(pointsToRupees(515), 51);
  assert.equal(pointsToRupees(9), 0);
});

test("medicine checkout cannot redeem points", () => {
  assert.equal(pointsRedeemAllowedForKind("medicine"), false);
  assert.equal(pointsRedeemAllowedForKind("lab"), true);
  assert.equal(pointsRedeemAllowedForKind("radiology"), true);
  assert.equal(pointsRedeemAllowedForKind("homecare"), true);
  assert.equal(pointsRedeemAllowedForKind("ambulance"), true);
  assert.equal(pointsRedeemAllowedForKind("psychologist"), true);
  assert.equal(pointsRedeemAllowedForKind("doctor"), true);
  assert.equal(pointsRedeemAllowedForKind("cart"), true);
});

test("checkout redeem shows only for online service payments over 500 points", () => {
  const ready = { points: 510, eligibleRupees: 800 };
  assert.equal(
    pointsRedeemAllowedAtCheckout({ kind: "lab", method: "upi", ...ready }),
    true
  );
  assert.equal(
    pointsRedeemAllowedAtCheckout({ kind: "radiology", method: "qr", ...ready }),
    true
  );
  assert.equal(
    pointsRedeemAllowedAtCheckout({ kind: "homecare", method: "credit", ...ready }),
    true
  );
  assert.equal(
    pointsRedeemAllowedAtCheckout({ kind: "lab", method: "cod", ...ready }),
    false
  );
  assert.equal(
    pointsRedeemAllowedAtCheckout({
      kind: "lab",
      method: "Cash On Visit",
      ...ready,
    }),
    false
  );
  assert.equal(
    pointsRedeemAllowedAtCheckout({ kind: "medicine", method: "upi", ...ready }),
    false
  );
  assert.equal(
    pointsRedeemAllowedAtCheckout({ kind: "lab", method: "upi", points: 500, eligibleRupees: 800 }),
    false
  );
});

test("clicking points opens redeem only when balance is over 500", () => {
  const low = pointsRedeemPanel(500);
  assert.equal(low.canRedeem, false);
  assert.equal(low.rupees, 0);
  assert.equal(low.message, undefined);

  const ready = pointsRedeemPanel(510);
  assert.equal(ready.canRedeem, true);
  assert.equal(ready.rupees, 51);
  assert.equal(ready.message, undefined);
});

test("mixed cart allocates redeemed rupees only to service totals", () => {
  const [lab, unused] = allocatePointsAcrossServices([200, 0], 51, 510);
  assert.equal(lab.pointsDiscountRupees, 51);
  assert.equal(lab.pointsUsed, 510);
  assert.equal(unused.pointsDiscountRupees, 0);
  assert.equal(unused.pointsUsed, 0);
});
