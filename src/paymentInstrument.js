import { resolveCollector } from "./paymentSplit.js";
import { emptyPaymentDetails } from "./paymentMethods.js";

let checkoutInstrument = {
  method: "cod",
  details: emptyPaymentDetails(),
  save: false,
  paidOn: "customer",
  collector: "partner",
};

export function setCheckoutInstrument(next) {
  const method = next?.method || "cod";
  const paidOn = next?.paidOn === "partner" ? "partner" : "customer";
  checkoutInstrument = {
    method,
    details: { ...emptyPaymentDetails(), ...(next?.details || {}) },
    save: Boolean(next?.save),
    paidOn,
    collector: resolveCollector({ method, paidOn }),
  };
}

export function getCheckoutInstrument() {
  return checkoutInstrument;
}

export function clearSensitiveInstrument() {
  checkoutInstrument = {
    ...checkoutInstrument,
    details: {
      ...checkoutInstrument.details,
      cardNumber: "",
      cvv: "",
      accountNumber: "",
    },
  };
}
