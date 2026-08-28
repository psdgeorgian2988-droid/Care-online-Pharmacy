import { emptyPaymentDetails, isOnlinePayment } from "./paymentMethods.js";

let checkoutInstrument = {
  method: "cod",
  details: emptyPaymentDetails(),
  save: false,
  collector: "partner",
};

export function setCheckoutInstrument(next) {
  const method = next?.method || "cod";
  checkoutInstrument = {
    method,
    details: { ...emptyPaymentDetails(), ...(next?.details || {}) },
    save: Boolean(next?.save),
    collector:
      next?.collector || (isOnlinePayment(method) ? "medihome" : "partner"),
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
