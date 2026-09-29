import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { educationRouteFromHash } from "./hashRoute.js";

const bookingFlow = readFileSync(new URL("./BookingFlow.jsx", import.meta.url), "utf8");
const labTests = readFileSync(new URL("./LabTests.jsx", import.meta.url), "utf8");
const cartCheckout = readFileSync(new URL("./CartCheckout.jsx", import.meta.url), "utf8");

test("BookingFlow keeps real boxes so checkout Pay stays clickable", () => {
  assert.equal(/display\s*:\s*contents/.test(bookingFlow), false);
  assert.match(bookingFlow, /is-stack/);
});

test("lab and radiology booking forms include customer payment options", () => {
  const bookFoot = labTests.indexOf('className="lab-book-foot"');
  assert.ok(bookFoot > 0, "booking footer should exist");
  assert.match(labTests, /Cash On Visit \/ Collection/);
  assert.match(labTests, /diagnosticPartnerRouteFields/);
  assert.match(cartCheckout, /<PaymentBlock/);
  assert.match(cartCheckout, /goHomeAfterPaidCheckout/);
  assert.match(labTests, /goHomeAfterPaidCheckout/);
  assert.match(labTests, /labBookingHash/);
  assert.match(labTests, /blankDiagnosticBookingForm/);
  assert.match(labTests, /checkoutUsesPayCta\(payMethod\)/);
  assert.match(labTests, /Confirm booking · ₹\$\{total\}/);
  assert.match(labTests, /showCustomerPayNow\(booking\)/);
  assert.match(cartCheckout, /checkoutUsesPayCta\(payMethod\)/);
  assert.match(cartCheckout, /Place order/);
});

test("confirmation keeps Pay now until the customer pays online", () => {
  assert.match(labTests, /setFlowStep\("placed"\)/);
  assert.match(labTests, /Pay now/);
  assert.match(labTests, /persistUnsettledCheckoutFields/);
  assert.match(cartCheckout, /Pay now/);
  assert.match(cartCheckout, /persistUnsettledCheckoutFields/);
  assert.match(cartCheckout, /confirmPayOpen/);
  const labPayBlock = labTests.indexOf('flowStep === "pay"');
  const labPayment = labTests.indexOf("<PaymentBlock", labPayBlock);
  assert.ok(labPayBlock > 0 && labPayment > labPayBlock, "PaymentBlock should sit on the confirm Pay now step");
});

test("customer PaymentBlock asks for card and bank details, not debit/credit radios", () => {
  const paymentBlock = readFileSync(new URL("./PaymentBlock.jsx", import.meta.url), "utf8");
  const methods = readFileSync(new URL("./paymentMethods.js", import.meta.url), "utf8");
  assert.match(paymentBlock, /Card Number/);
  assert.match(paymentBlock, /Name On Card/);
  assert.match(paymentBlock, /MM\/YY/);
  assert.match(paymentBlock, /CVV/);
  assert.match(paymentBlock, /Account Holder Name/);
  assert.match(paymentBlock, /Account Number/);
  assert.match(paymentBlock, /IFSC/);
  assert.match(paymentBlock, /detectCardFunding/);
  assert.match(paymentBlock, /pay-method-pick/);
  assert.match(paymentBlock, /Choose how to pay/);
  assert.match(paymentBlock, /Pay now/);
  assert.match(methods, /value: "card"/);
  assert.equal(/value: "credit"/.test(methods), false);
  assert.equal(/value: "debit"/.test(methods), false);
});

test("lab and cart show payment dropdown after confirmation Pay now", () => {
  const paymentBlock = readFileSync(new URL("./PaymentBlock.jsx", import.meta.url), "utf8");
  assert.match(paymentBlock, /pay-method-pick/);
  assert.match(paymentBlock, /Choose how to pay/);
  assert.match(labTests, /showCustomerPayNow\(booking\)/);
  assert.match(cartCheckout, /showCustomerPayNow/);
});

test("Health Education tabs use hash so Back can restore the section", () => {
  const education = readFileSync(new URL("./HealthEducation.jsx", import.meta.url), "utf8");
  assert.match(education, /educationRouteFromHash/);
  assert.match(education, /goToHash\(`#education\?service=\$\{item\.id\}`\)/);
  assert.match(education, /goToHash\(`#education\?service=quiz&id=\$\{item\.id\}`\)/);
  assert.equal(educationRouteFromHash("#education?service=guides").tab, "guides");
});
