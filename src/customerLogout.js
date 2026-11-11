import { logoutSession } from "./authSession.js";
import { readUserProfile } from "./addressFields.js";
import { rememberAccount } from "./accountBook.js";
import { publishAccount } from "./accountSync.js";
import { clearGuestCheckout } from "./guestCheckout.js";
import { goToHash } from "./hashRoute.js";

/** End a registered customer login and return to the welcome gate. */
export function logOutCustomer() {
  const profile = readUserProfile();
  rememberAccount(profile);
  logoutSession();
  clearGuestCheckout();
  publishAccount(profile);
  goToHash("#home");
}
