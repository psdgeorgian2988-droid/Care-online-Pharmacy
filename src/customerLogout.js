import { logoutSession } from "./authSession.js";
import { clearGuestCheckout } from "./guestCheckout.js";
import { goToHash } from "./hashRoute.js";

/** End a registered customer login and return to the welcome gate. */
export function logOutCustomer() {
  logoutSession();
  clearGuestCheckout();
  goToHash("#home");
}
