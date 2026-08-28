import { emptyPaymentDetails } from "./paymentMethods.js";

let checkoutInstrument = {
  method: "cod",
  details: emptyPaymentDetails(),
  save: false,
};

export function setCheckoutInstrument(next) {
  checkoutInstrument = {
    method: next?.method || "cod",
    details: { ...emptyPaymentDetails(), ...(next?.details || {}) },
    save: Boolean(next?.save),
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
