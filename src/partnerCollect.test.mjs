import test from "node:test";
import assert from "node:assert/strict";
import {
  collectionMethodFromParts,
  isCodCollectMethod,
  isCodCollectOrder,
  paidOnCustomerApp,
  partnerCollectMethodOptions,
  partnerCollectPatch,
  paymentPartsLabel,
  receiptError,
  sharePartnerCollectionQr,
  splitCollectionError,
  usesCodFieldCollect,
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

test("COD collect offers only Cash, QR, and UPI", () => {
  const codJob = {
    ...job,
    paymentMethod: "cod",
    paymentStatus: "cod",
    paidOn: "later",
    paid: false,
  };
  assert.equal(isCodCollectOrder(codJob), true);
  assert.equal(isCodCollectOrder({ ...codJob, paymentStatus: "paid", paid: true }), false);
  assert.equal(
    isCodCollectOrder({
      paymentMethod: "upi",
      paymentStatus: "paid",
      paid: true,
      paidOn: "customer",
    }),
    false
  );
  assert.equal(isCodCollectMethod("card"), false);
  assert.equal(isCodCollectMethod("bank"), false);
  assert.deepEqual(
    partnerCollectMethodOptions(codJob).map((row) => row.value),
    ["cod", "qr", "upi"]
  );
  assert.ok(
    partnerCollectMethodOptions({ paymentMethod: "pending", paymentStatus: "awaiting_payment" })
      .map((row) => row.value)
      .includes("card")
  );
  assert.equal(usesCodFieldCollect(codJob, "upi"), true);
  assert.equal(usesCodFieldCollect(codJob, "card"), false);
});

test("COD collect rejects card and bank and persists paid fields", () => {
  const codJob = {
    ...job,
    paymentMethod: "cod",
    paymentStatus: "cod",
    paidOn: "later",
    paid: false,
  };
  const blocked = partnerCollectPatch(codJob, { paymentMethod: "card", receipt });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /Cash, QR, or UPI/i);
  const splitBlocked = partnerCollectPatch(codJob, {
    splitCollection: true,
    paymentParts: [
      { method: "card", amountRupees: 1000 },
      { method: "upi", amountRupees: 840 },
    ],
    receipt,
  });
  assert.equal(splitBlocked.ok, false);
  const cash = partnerCollectPatch(codJob, { paymentMethod: "cod", receipt }, 1_800_000_000_000);
  assert.equal(cash.ok, true);
  assert.equal(cash.patch.paymentStatus, "paid");
  assert.equal(cash.patch.paid, true);
  assert.equal(cash.patch.paymentMethod, "cod");
  assert.equal(cash.patch.paidOn, "partner");
  assert.equal(cash.patch.collector, "partner");
  const qr = partnerCollectPatch(codJob, { paymentMethod: "qr" });
  assert.equal(qr.ok, true);
  assert.equal(qr.patch.paymentStatus, "paid");
  assert.equal(qr.patch.paymentMethod, "qr");
  assert.equal(qr.patch.paidOn, "partner");
  const upi = partnerCollectPatch(codJob, { paymentMethod: "upi" });
  assert.equal(upi.ok, true);
  assert.equal(upi.patch.paymentStatus, "paid");
  assert.equal(upi.patch.paymentMethod, "upi");
  assert.equal(upi.patch.paidOn, "partner");
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

test("share QR uses the system share sheet when available", async () => {
  const shared = [];
  const result = await sharePartnerCollectionQr({
    qrSrc: "",
    text: "Please pay",
    uri: "upi://pay?am=499.00",
    share: async (payload) => {
      shared.push(payload);
    },
    writeText: async () => {
      throw new Error("should not copy");
    },
    download: () => {
      throw new Error("should not download");
    },
  });
  assert.equal(result.ok, true);
  assert.match(result.note, /shared/i);
  assert.equal(shared.length, 1);
  assert.match(shared[0].text, /Please pay/);
});

test("share QR copies the payment link when share is unavailable", async () => {
  let copied = "";
  const result = await sharePartnerCollectionQr({
    qrSrc: "data:image/png;base64,abc",
    text: "Please pay",
    uri: "upi://pay?am=499.00",
    share: null,
    canShare: null,
    writeText: async (value) => {
      copied = value;
    },
    download: () => {
      throw new Error("should not download");
    },
  });
  assert.equal(result.ok, true);
  assert.match(result.note, /copied/i);
  assert.match(copied, /upi:\/\/pay/);
});

test("share QR downloads the image when share and copy are unavailable", async () => {
  let downloaded = "";
  const result = await sharePartnerCollectionQr({
    qrSrc: "data:image/png;base64,abc",
    text: "Please pay",
    uri: "upi://pay?am=499.00",
    share: null,
    canShare: null,
    writeText: null,
    download: (src) => {
      downloaded = src;
      return true;
    },
  });
  assert.equal(result.ok, true);
  assert.match(result.note, /downloaded/i);
  assert.equal(downloaded, "data:image/png;base64,abc");
});
