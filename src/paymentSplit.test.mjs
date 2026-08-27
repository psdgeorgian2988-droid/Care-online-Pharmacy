import test from "node:test";
import assert from "node:assert/strict";
import { applyCoupon } from "./offers.js";
import { quoteCheckout, splitPayment } from "./paymentSplit.js";

test("without discount the partner still gets the remainder of sale", () => {
  const split = splitPayment("medicine", 100, "110001");
  assert.equal(split.partnerPercent, 60);
  assert.equal(split.platformPercent, 40);
  assert.equal(split.partnerRupees, 60);
  assert.equal(split.platformRupees, 40);
  assert.equal(split.totalRupees, 100);
});

test("coupon or offer discount is taken only from MediHome, partner keeps % of MRP", () => {
  const split = splitPayment("medicine", 65, "110001", {
    saleRupees: 100,
    payableRupees: 65,
    platformPercent: 40,
    couponCode: "CARE35",
  });
  assert.equal(split.partnerPercent, 60);
  assert.equal(split.partnerRupees, 60);
  assert.equal(split.discountRupees, 35);
  assert.equal(split.payableRupees, 65);
  assert.equal(split.platformRupees, 5);
  assert.equal(split.partnerTransferRupees, 60);
});

test("listed medicine offer also comes from MediHome share", () => {
  const quote = quoteCheckout({
    kind: "medicine",
    saleRupees: 100,
    listRupees: 92,
    pin: "110001",
  });
  assert.equal(quote.offerDiscountRupees, 8);
  assert.equal(quote.payableRupees, 92);
  assert.equal(quote.split.partnerRupees, 60);
  assert.equal(quote.split.platformRupees, 32);
});

test("CARE35 on MRP 100 leaves partner 60% and MediHome the rest after discount", () => {
  const quote = quoteCheckout({
    kind: "medicine",
    saleRupees: 100,
    listRupees: 100,
    couponCode: "CARE35",
    pin: "110001",
  });
  assert.equal(quote.couponDiscountRupees, 35);
  assert.equal(quote.payableRupees, 65);
  assert.equal(quote.split.partnerPercent, 60);
  assert.equal(quote.split.partnerRupees, 60);
  assert.equal(quote.split.platformRupees, 5);
});

test("if discount is larger than MediHome share, partner transfer is capped at the amount collected", () => {
  const quote = quoteCheckout({
    kind: "medicine",
    saleRupees: 100,
    listRupees: 100,
    couponCode: "SAVE100",
    pin: "110001",
  });
  assert.equal(quote.payableRupees, 0);
  assert.equal(quote.split.partnerRupees, 60);
  assert.equal(quote.split.platformRupees, -60);
  assert.equal(quote.split.partnerTransferRupees, 0);
  assert.equal(quote.split.platformSettledRupees, 0);
});

test("unknown coupon is rejected", () => {
  const result = applyCoupon("NOTREAL", 100);
  assert.equal(result.ok, false);
});

test("coupon codes are matched after trim and case fold", () => {
  const result = applyCoupon("  care35 ", 100);
  assert.equal(result.ok, true);
  assert.equal(result.coupon.code, "CARE35");
  assert.equal(result.discountRupees, 35);
});
