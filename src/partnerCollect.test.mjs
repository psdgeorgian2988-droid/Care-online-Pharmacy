import test from "node:test";
import assert from "node:assert/strict";
import {
  collectionMethodFromParts,
  paidOnCustomerApp,
  partnerCollectPatch,
  paymentPartsLabel,
  receiptError,
  splitCollectionError,
} from "./partnerCollect.js";
import { orderPaymentSummary } from "./orderFullFields.js";
import { paymentUpiUri } from "./paymentMethods.js";

const receipt = {
  fileName: "receipt.jpg",
  fileType: "image/jpeg",
  fileData: "data:image/jpeg;base64,/9j/4AAQ",
};

const job = {
  kind: "lab",
  total: 1840,
  split: {
    payableRupees: 1840,
    saleRupees: 1840,
    platformPercent: 15,
    staffSet: true,
  },
  partnerConfirmStatus: "accepted",
  partnerConfirmed: true,
};

test("split collection requires two methods that add up to the payable", () => {
  assert.match(splitCollectionError([{ method: "cod", amountRupees: 1840 }], 1840), /two/i);
  assert.match(
    splitCollectionError(
      [
        { method: "cod", amountRupees: 800 },
        { method: "upi", amountRupees: 800 },
      ],
      1840
    ),
    /add up/i
  );
  assert.equal(
    splitCollectionError(
      [
        { method: "cod", amountRupees: 1000 },
        { method: "upi", amountRupees: 840 },
      ],
      1840
    ),
    ""
  );
});

test("partner collection needs a receipt photo", () => {
  const result = partnerCollectPatch(job, { paymentMethod: "cod" });
  assert.equal(result.ok, false);
  assert.match(receiptError(null), /photo/i);
});

test("gateway payment can complete without a receipt photo", () => {
  const result = partnerCollectPatch(job, {
    paymentMethod: "upi",
    paymentId: "MH-PAY-gateway",
  });
  assert.equal(result.ok, true);
  assert.equal(result.patch.paymentId, "MH-PAY-gateway");
  assert.equal(result.patch.status, "Completed");
});

test("partner collection marks the order paid and completed", () => {
  const result = partnerCollectPatch(
    job,
    { paymentMethod: "upi", receipt },
    1_700_000_000_000
  );
  assert.equal(result.ok, true);
  assert.equal(result.patch.paymentStatus, "paid");
  assert.equal(result.patch.status, "Completed");
  assert.equal(result.patch.trackStatus, "done");
  assert.equal(result.patch.trackCompleted, true);
  assert.equal(result.patch.completedAt, 1_700_000_000_000);
  assert.equal(result.patch.split.staffSet, true);
});

test("split collection stores both parts and completes the order", () => {
  const result = partnerCollectPatch(job, {
    splitCollection: true,
    paymentParts: [
      { method: "cod", amountRupees: 1000 },
      { method: "upi", amountRupees: 840 },
    ],
    receipt,
  });
  assert.equal(result.patch.receiptFileName, "receipt.jpg");
  assert.equal(result.ok, true);
  assert.equal(result.patch.paymentMethod, "split");
  assert.equal(result.patch.paymentParts.length, 2);
  assert.equal(result.patch.status, "Completed");
  assert.equal(collectionMethodFromParts(result.patch.paymentParts), "split");
  assert.equal(paymentPartsLabel(result.patch.paymentParts), "Cash / COD ₹1,000 + UPI ₹840");
});

test("payable falls back to line items when total is missing", () => {
  const result = partnerCollectPatch(
    { kind: "lab", items: [{ name: "CBC", price: 350, quantity: 1 }] },
    {
      splitCollection: true,
      paymentParts: [
        { method: "cod", amountRupees: 200 },
        { method: "upi", amountRupees: 150 },
      ],
      receipt,
    }
  );
  assert.equal(result.ok, true);
  assert.equal(result.patch.split.payableRupees, 350);
  assert.equal(result.patch.status, "Completed");
});

test("order payment summary shows split parts without staff percent", () => {
  const paid = {
    ...job,
    paymentMethod: "split",
    paymentStatus: "paid",
    paymentParts: [
      { method: "cod", amountRupees: 1000 },
      { method: "upi", amountRupees: 840 },
    ],
  };
  const partner = orderPaymentSummary(paid, "partner");
  assert.equal(partner.showSplit, false);
  assert.equal(partner.methodText, "Cash / COD ₹1,000 + UPI ₹840");
});

test("customer-app payments are treated as already paid for the partner desk", () => {
  assert.equal(
    paidOnCustomerApp({
      paymentStatus: "paid",
      paidOn: "customer",
      collector: "medihome",
      paymentMethod: "upi",
    }),
    true
  );
  assert.equal(paidOnCustomerApp({ paymentStatus: "cod" }), false);
});

test("collection QR encodes the payable and order id", () => {
  const uri = paymentUpiUri({
    amount: 350,
    kind: "lab",
    orderId: "TEST-LAB-001",
    pn: "Test Partner Desk",
  });
  assert.match(uri, /^upi:\/\/pay\?/);
  assert.match(uri, /am=350.00/);
  assert.match(uri, /TEST-LAB-001/);
});
