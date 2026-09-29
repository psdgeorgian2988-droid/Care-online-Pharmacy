import assert from "node:assert/strict";
import { test } from "node:test";
import { toStoredInstrument } from "./savedPayments.js";
import {
  PAYMENT_METHOD_OPTIONS,
  checkoutPaymentPersistFields,
  checkoutUsesPayCta,
  customerPaidAtCheckout,
  isCashOnDeliveryMethod,
  isOnlinePayment,
  isPaidCheckoutMethod,
  parseUpiFromQr,
  paymentMethodSummary,
  persistUnsettledCheckoutFields,
  showCustomerPayNow,
  validatePaymentDetails,
} from "./paymentMethods.js";

test("customer checkout keeps COD, UPI and QR payment options", () => {
  const values = PAYMENT_METHOD_OPTIONS.map((option) => option.value);
  assert.deepEqual(
    ["cod", "upi", "qr"].every((value) => values.includes(value)),
    true
  );
  assert.equal(isPaidCheckoutMethod("cod", { paymentStatus: "cod" }), false);
  assert.equal(isPaidCheckoutMethod("upi", { paymentStatus: "paid" }), true);
  assert.equal(checkoutUsesPayCta("cod"), false);
  assert.equal(checkoutUsesPayCta("upi"), true);
  assert.equal(checkoutUsesPayCta("qr"), true);
  assert.equal(checkoutUsesPayCta("card"), true);
  assert.equal(checkoutUsesPayCta("credit"), true);
  assert.equal(isCashOnDeliveryMethod("cod"), true);
  assert.equal(isCashOnDeliveryMethod("Cash On Visit"), true);
  const labCod = checkoutPaymentPersistFields("cod", {
    paymentMethod: "cod",
    paymentStatus: "cod",
    paidOn: "customer",
  });
  assert.equal(labCod.paid, false);
  assert.equal(labCod.paymentStatus, "cod");
  assert.equal(labCod.paidOn, "later");
  assert.equal(showCustomerPayNow(labCod), false);
  assert.equal(customerPaidAtCheckout(labCod), false);
  const labUpi = checkoutPaymentPersistFields("upi", {
    paymentMethod: "upi",
    paymentStatus: "paid",
  });
  assert.equal(labUpi.paid, true);
  assert.equal(labUpi.paymentStatus, "paid");
  assert.equal(labUpi.paidOn, "customer");
  assert.equal(showCustomerPayNow(labUpi), false);
  assert.equal(customerPaidAtCheckout(labUpi), true);
  const awaitingUpi = persistUnsettledCheckoutFields("upi");
  assert.equal(awaitingUpi.paid, false);
  assert.equal(showCustomerPayNow(awaitingUpi), true);
});

test("UPI, QR, cards and bank account count as online payment", () => {
  assert.equal(isOnlinePayment("qr"), true);
  assert.equal(isOnlinePayment("upi"), true);
  assert.equal(isOnlinePayment("card"), true);
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
  const stored = toStoredInstrument("card", {
    cardNumber: "4111111111111111",
    cvv: "123",
    nameOnCard: "Kavita Verma",
    expiryMonth: "3",
    expiryYear: "2030",
  });
  const text = JSON.stringify(stored);
  assert.equal(stored.cardLast4, "1111");
  assert.equal(stored.cardBrand, "Visa");
  assert.equal(stored.cardFunding, "credit");
  assert.equal(stored.type, "card");
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
    validatePaymentDetails("card", {
      cardNumber: "4111111111111111",
      nameOnCard: "Kavita",
      expiry: "12/30",
      cvv: "",
    }),
    /cvv/i
  );
  assert.equal(
    validatePaymentDetails("upi", { upiId: "kavita@okicici" }),
    ""
  );
});

test("checkout shows one Card option, not separate debit and credit", () => {
  const values = PAYMENT_METHOD_OPTIONS.map((option) => option.value);
  assert.deepEqual(values.includes("card"), true);
  assert.equal(values.includes("credit"), false);
  assert.equal(values.includes("debit"), false);
  assert.equal(values.filter((value) => value === "card").length, 1);
});
