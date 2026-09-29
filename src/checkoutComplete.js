import { goToHash } from "./hashRoute.js";
import { writeMedicineCart, writeTestCart } from "./medicineCartStore.js";
import { isPaidCheckoutMethod } from "./paymentMethods.js";

export function clearCheckoutCarts(store) {
  writeMedicineCart([], store);
  writeTestCart([], store);
}

export function shouldGoHomeAfterPayment(method, payment) {
  return isPaidCheckoutMethod(method, payment);
}

/** Persist/send the order first, then call this so leftover cart lines and Pay now are gone. */
export function goHomeAfterPaidCheckout(store) {
  clearCheckoutCarts(store);
  goToHash("#home");
}
