import test from "node:test";
import assert from "node:assert/strict";
import { applyCoupon } from "./offers.js";
import {
  ledgerShareText,
  partnerSettlementNote,
  quoteCheckout,
  settlementOpsNote,
  splitPayment,
} from "./paymentSplit.js";
import { buildOrderBill } from "./orderBill.js";

test("without discount the partner still gets the remainder of sale", () => {
  const split = splitPayment("medicine", 100, "110001");
  assert.equal(split.partnerPercent, 60);
  assert.equal(split.platformPercent, 40);
  assert.equal(split.partnerRupees, 60);
  assert.equal(split.platformRupees, 40);
  assert.equal(split.totalRupees, 100);
  assert.equal(split.splitMode, "forward");
  assert.equal(split.collector, "medihome");
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

test("cash collected by the service provider puts MediHome share as a balance towards them", () => {
  const split = splitPayment("homecare", 299, "110001", {
    paymentMethod: "cod",
    collector: "partner",
  });
  assert.equal(split.splitMode, "reverse");
  assert.equal(split.collection, "cash");
  assert.equal(split.dueFromPartnerRupees, split.platformSettledRupees);
  assert.equal(split.dueToPartnerRupees, 0);
  assert.match(
    split.ledger.at(-1).note,
    /balance towards service provider/i
  );
});

test("online collected by the service provider credits partner share and the rest to MediHome", () => {
  const split = splitPayment("lab", 1000, "110001", {
    paymentMethod: "upi",
    collector: "partner",
  });
  assert.equal(split.splitMode, "reverse");
  assert.equal(split.collection, "online");
  assert.equal(split.partnerAccountRupees, split.partnerTransferRupees);
  assert.equal(split.medihomeAccountRupees, split.platformSettledRupees);
  assert.equal(split.dueFromPartnerRupees, 0);
  assert.match(split.ledger[0].note, /service provider/i);
});

test("cash without an explicit collector defaults to reverse split", () => {
  const split = splitPayment("medicine", 100, "110001", {
    paymentMethod: "cod",
  });
  assert.equal(split.splitMode, "reverse");
  assert.equal(split.collector, "partner");
  assert.equal(split.dueFromPartnerRupees, split.platformSettledRupees);
});

test("cash collected by MediHome is a forward split payable to the partner", () => {
  const split = splitPayment("medicine", 100, "110001", {
    paymentMethod: "cod",
    collector: "medihome",
  });
  assert.equal(split.splitMode, "forward");
  assert.equal(split.dueToPartnerRupees, 60);
  assert.equal(split.dueFromPartnerRupees, 0);
  assert.match(settlementOpsNote(split), /Forward Split/i);
  assert.match(partnerSettlementNote(split), /Due To You/i);
});

test("shared ledger text names both parties and the amount due", () => {
  const split = splitPayment("homecare", 299, "110001", {
    paymentMethod: "cod",
    collector: "partner",
  });
  const text = ledgerShareText(split);
  assert.match(text, /Reverse Split/);
  assert.match(text, /Due From Service Provider/);
  assert.match(text, /MediHome/);
});

test("order bill includes a shareable settlement ledger", () => {
  const bill = buildOrderBill({
    kind: "homecare",
    id: "HC1",
    total: 299,
    paymentMethod: "cod",
    collector: "partner",
    split: splitPayment("homecare", 299, "110001", {
      paymentMethod: "cod",
      collector: "partner",
    }),
  });
  assert.match(bill.settlementSummary, /balance towards the service provider/i);
  assert.match(bill.ledgerText, /Due From Service Provider/);
  assert.equal(bill.settlement.splitMode, "reverse");
});
