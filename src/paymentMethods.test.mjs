import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bankNameFromIfsc,
  detectCardFunding,
  formatCardExpiry,
  parseCardExpiry,
  paymentDetailsReady,
  paymentInstrumentPublicFields,
  showCustomerPayNow,
  validatePaymentDetails,
} from "./paymentMethods.js";

test("BIN prefixes self-detect debit vs credit after 4 digits", () => {
  assert.equal(detectCardFunding("411"), "");
  assert.equal(detectCardFunding("4111"), "credit");
  assert.equal(detectCardFunding("4111111111111111"), "credit");
  assert.equal(detectCardFunding("4026 1234 5678 9012"), "debit");
  assert.equal(detectCardFunding("5018 1234 5678 9012"), "debit");
  assert.equal(detectCardFunding("3782 822463 10005"), "credit");
  assert.equal(detectCardFunding("6082 0012 3456 7890"), "debit");
  assert.equal(detectCardFunding("5555 5555 5555 4444"), "credit");
});

test("card Pay stays blocked until number, name, MM/YY and CVV are valid", () => {
  assert.equal(paymentDetailsReady("card", {}), false);
  assert.equal(
    paymentDetailsReady("card", {
      cardNumber: "4111111111111111",
      nameOnCard: "Kavita Verma",
      expiry: "12/30",
      cvv: "123",
    }),
    true
  );
  assert.match(
    validatePaymentDetails("card", {
      cardNumber: "4111111111111",
      nameOnCard: "Kavita",
      expiry: "12/30",
      cvv: "123",
    }),
    /card number/i
  );
  assert.match(
    validatePaymentDetails("card", {
      cardNumber: "4111111111111111",
      nameOnCard: "Kavita",
      expiry: "13/30",
      cvv: "123",
    }),
    /MM\/YY/i
  );
});

test("bank Pay needs account holder, account number and IFSC", () => {
  assert.equal(paymentDetailsReady("bank", {}), false);
  assert.equal(
    paymentDetailsReady("bank", {
      accountName: "Kavita Verma",
      accountNumber: "123456789012",
      ifsc: "HDFC0001234",
    }),
    true
  );
  assert.equal(bankNameFromIfsc("HDFC0001234"), "HDFC Bank");
  assert.match(
    validatePaymentDetails("bank", {
      accountName: "Kavita",
      accountNumber: "12",
      ifsc: "HDFC0001234",
    }),
    /account number/i
  );
});

test("Pay now is off after online payment or COD is selected", () => {
  assert.equal(showCustomerPayNow({ paymentMethod: "pending", paid: false }), true);
  assert.equal(showCustomerPayNow({ paymentMethod: "upi", paymentStatus: "awaiting_payment", paid: false }), true);
  assert.equal(showCustomerPayNow({ paymentMethod: "cod", paymentStatus: "cod", paid: false }), false);
  assert.equal(showCustomerPayNow({ paymentMethod: "cash", paid: false }), false);
  assert.equal(showCustomerPayNow({ paymentMethod: "upi", paymentStatus: "paid", paid: true }), false);
});

test("UPI and QR do not require card or bank fields", () => {
  assert.equal(paymentDetailsReady("qr", {}), true);
  assert.equal(paymentDetailsReady("upi", { upiId: "kavita@okicici" }), true);
  assert.equal(paymentDetailsReady("cod", {}), true);
});

test("public instrument fields keep last4 and type, never PAN or CVV", () => {
  const publicFields = paymentInstrumentPublicFields("card", {
    cardNumber: "4111111111111111",
    cvv: "123",
    nameOnCard: "Kavita",
    expiry: "12/30",
  });
  const text = JSON.stringify(publicFields);
  assert.equal(publicFields.cardLast4, "1111");
  assert.equal(publicFields.cardBrand, "Visa");
  assert.equal(publicFields.cardFunding, "credit");
  assert.equal(text.includes("4111111111111111"), false);
  assert.equal("cvv" in publicFields, false);
  assert.equal("cardNumber" in publicFields, false);
});

test("MM/YY expiry formats and parses", () => {
  assert.equal(formatCardExpiry("122"), "12/2");
  assert.equal(formatCardExpiry("1230"), "12/30");
  assert.deepEqual(parseCardExpiry("12/30"), { month: 12, year: 2030 });
});
