import {
  emptyAddress,
  pickAddress,
  readUserProfile,
  validateAddress,
  withFormattedAddress,
} from "./addressFields.js";
import { PROFILE_KEY } from "./authSession.js";
import { GUEST_REGISTER_BENEFITS } from "./guestOrder.js";

export const GUEST_CHECKOUT_KEY = "mediHomeGuestCheckout";

export function emptyGuestCheckout() {
  return {
    name: "",
    mobile: "",
    ...emptyAddress(),
  };
}

export function readGuestCheckout(store) {
  try {
    const storage = store || globalThis.localStorage;
    const raw = storage?.getItem?.(GUEST_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const mobile = String(parsed.mobile || "")
      .replace(/\D/g, "")
      .slice(0, 10);
    if (!/^[6-9]\d{9}$/.test(mobile)) return null;
    return {
      ...emptyGuestCheckout(),
      ...pickAddress(parsed),
      name: String(parsed.name || "").trim(),
      mobile,
      savedAt: parsed.savedAt || "",
    };
  } catch {
    return null;
  }
}

export function writeGuestCheckout(details, store) {
  const storage = store || globalThis.localStorage;
  const mobile = String(details.mobile || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  const profile = withFormattedAddress({
    ...emptyGuestCheckout(),
    ...details,
    mobile,
    addressConfirmed: "yes",
  });
  const guest = {
    ...pickAddress(profile),
    name: String(details.name || "").trim() || "Guest",
    mobile,
    isGuest: true,
    savedAt: new Date().toISOString(),
  };
  storage?.setItem?.(GUEST_CHECKOUT_KEY, JSON.stringify(guest));

  // Seed address/mobile for checkout without creating a login session.
  try {
    const existing = readUserProfile();
    const next = {
      ...existing,
      name: guest.name,
      mobile: guest.mobile,
      ...pickAddress(guest),
      isGuest: true,
    };
    storage?.setItem?.(PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return guest;
}

export function clearGuestCheckout(store) {
  try {
    (store || globalThis.localStorage)?.removeItem?.(GUEST_CHECKOUT_KEY);
  } catch {
    /* ignore */
  }
}

export function validateGuestCheckout(source = {}) {
  const mobile = String(source.mobile || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  const errors = { ...validateAddress({ ...source, addressConfirmed: "yes" }) };
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }
  return errors;
}

export function guestHasCheckout(store) {
  return Boolean(readGuestCheckout(store));
}

export { GUEST_REGISTER_BENEFITS };
