import assert from "node:assert/strict";
import { test } from "node:test";
import { toStoredInstrument } from "./savedPayments.js";
import {
  PAYMENT_METHOD_OPTIONS,
  isOnlinePayment,
  parseUpiFromQr,
  paymentMethodSummary,
  validatePaymentDetails,
} from "./paymentMethods.js";

test("UPI, QR, cards and bank account count as online payment", () => {
  assert.equal(isOnlinePayment("qr"), true);
  assert.equal(isOnlinePayment("upi"), true);
  assert.equal(isOnlinePayment("credit"), true);
  assert.equal(isOnlinePayment("debit"), true);
  assert.equal(isOnlinePayment("bank"), true);
  assert.equal(isOnlinePayment("cod"), false);
  assert.equal(paymentMethodSummary("qr"), "Paid By QR Code");
  assert.equal(paymentMethodSummary("scan"), "Paid By QR Code");
  assert.equal(validatePaymentDetails("qr", {}), "");
  const radioValues = PAYMENT_METHOD_OPTIONS.map((option) => option.value);
  assert.deepEqual(
    radioValues.filter((value) => ["qr", "scan", "share"].includes(value)),
    ["qr"]
  );
});

test("UPI QR text yields a VPA", () => {
  assert.equal(parseUpiFromQr("kavita@okicici"), "kavita@okicici");
  assert.equal(
    parseUpiFromQr("upi://pay?pa=kavita@okicici&pn=Kavita&am=100"),
    "kavita@okicici"
  );
  assert.equal(parseUpiFromQr("not-a-qr"), "");
});

test("saved card keeps last 4 digits and never keeps PAN or CVV", () => {
  const stored = toStoredInstrument("credit", {
    cardNumber: "4111111111111111",
    cvv: "123",
    nameOnCard: "Kavita Verma",
    expiryMonth: "3",
    expiryYear: "2030",
  });
  const text = JSON.stringify(stored);
  assert.equal(stored.cardLast4, "1111");
  assert.equal(stored.cardBrand, "Visa");
  assert.equal(text.includes("4111111111111111"), false);
  assert.equal("cvv" in stored, false);
  assert.equal("cardNumber" in stored, false);
});

test("saved bank account keeps IFSC and last 4 only", () => {
  const stored = toStoredInstrument("bank", {
    accountName: "Kavita Verma",
    accountNumber: "123456789012",
    ifsc: "HDFC0001234",
  });
  const text = JSON.stringify(stored);
  assert.equal(stored.accountLast4, "9012");
  assert.equal(stored.ifsc, "HDFC0001234");
  assert.equal(text.includes("123456789012"), false);
  assert.equal("accountNumber" in stored, false);
});

test("card payment needs CVV and does not treat empty UPI as valid", () => {
  assert.match(validatePaymentDetails("upi", { upiId: "" }), /upi/i);
  assert.match(
    validatePaymentDetails("credit", {
      cardNumber: "4111111111111111",
      nameOnCard: "Kavita",
      expiryMonth: "12",
      expiryYear: "2030",
      cvv: "",
    }),
    /cvv/i
  );
  assert.equal(
    validatePaymentDetails("upi", { upiId: "kavita@okicici" }),
    ""
  );
});
