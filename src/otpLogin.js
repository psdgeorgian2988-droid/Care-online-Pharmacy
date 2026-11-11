import { pickAddress, readUserProfile, withFormattedAddress } from "./addressFields.js";
import { findRememberedAccount, rememberAccount } from "./accountBook.js";
import { loginAccountOnServer, publishAccount } from "./accountSync.js";
import { profileLoginPin, normalizeLoginPin } from "./loginPin.js";
import {
  PROFILE_KEY,
  clearWelcomeRequest,
  markCustomerEntryChosen,
  writeLoginSession,
} from "./authSession.js";
import { findAccountActor, holderActor } from "./familyAccount.js";
import { goToHash } from "./hashRoute.js";
import { readGuestCheckout } from "./guestCheckout.js";

export function loginCodeNotice(result = {}) {
  if (result.devOtp && !/sent by/i.test(result.message || "")) {
    return `No message service is connected on this computer. Your login code is ${result.devOtp}.`;
  }
  return result.message || "Login code sent.";
}

export function deliveryAddressFrom(source = {}) {
  return pickAddress(source || {});
}

export function profileWithDeliveryAddress(profile = {}, delivery = {}) {
  const address = deliveryAddressFrom(delivery);
  const hasAddress = Boolean(
    address.houseNo || address.society || address.area || address.city || address.pinCode
  );
  if (!hasAddress) return { ...profile, isGuest: false };
  return {
    ...profile,
    ...withFormattedAddress({
      ...profile,
      ...address,
      addressConfirmed: "yes",
    }),
    isGuest: false,
  };
}

/** Save the delivery address onto the signed-in profile. */
export function saveDeliveryOnProfile(delivery = {}, storage = globalThis.localStorage) {
  const existing = readUserProfile();
  const mobile = String(existing?.mobile || "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(mobile)) return null;
  const profile = profileWithDeliveryAddress(
    {
      ...existing,
      mobile,
      creatorMobile: existing?.creatorMobile || mobile,
      name: existing?.name || delivery?.name || delivery?.patientName || "Customer",
      isGuest: false,
    },
    delivery
  );
  storage?.setItem?.(PROFILE_KEY, JSON.stringify(profile));
  publishAccount(profile);
  return profile;
}

export function accountProfileFromLogin({ account = null, mobile = "", delivery = null } = {}) {
  const saved = readUserProfile();
  const same = saved?.mobile && saved.mobile === mobile ? saved : {};
  const fromOrder = delivery || readGuestCheckout() || {};
  const profile = profileWithDeliveryAddress(
    {
      ...same,
      ...(account || {}),
      name:
        account?.name ||
        same.name ||
        fromOrder.patientName ||
        fromOrder.name ||
        "Customer",
      mobile,
      creatorMobile: account?.mobile || mobile,
      email: account?.email || same.email || "",
      isGuest: false,
    },
    fromOrder
  );
  return profile;
}

function openAccount(profile, mobile) {
  globalThis.localStorage?.setItem?.(PROFILE_KEY, JSON.stringify(profile));
  rememberAccount(profile);
  writeLoginSession(profile, findAccountActor(profile, mobile) || holderActor(profile));
  publishAccount(profile);
  markCustomerEntryChosen();
  clearWelcomeRequest();
  goToHash("#profile");
  return profile;
}

/** Open the account already stored for this mobile number or mail ID. */
export function openKnownAccount({ account = null, mobile = "", delivery = null } = {}) {
  const number = String(account?.mobile || mobile || "").replace(/\D/g, "").slice(-10);
  const profile = accountProfileFromLogin({ account, mobile: number, delivery });
  return { ok: true, profile: openAccount(profile, number) };
}

/** Open the account page after a password matches, and keep the delivery address on the profile. */
export async function signInWithPassword({ mobile = "", password = "", delivery = null } = {}) {
  const pin = normalizeLoginPin(password);
  const number = String(mobile || "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(number)) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }
  if (!pin) {
    return { ok: false, error: "Enter your 6-digit password." };
  }
  const saved = readUserProfile();
  const actor = saved.mobile ? findAccountActor(saved, number) : null;
  const remembered = findRememberedAccount(number);
  const known = remembered?.profile || (actor ? saved : null);
  const knownActor = remembered?.actor || actor;
  const knownPin = profileLoginPin(known || {});
  let account = null;
  if (known && knownActor && knownPin && knownPin === pin) {
    account = { ...known, loginPin: pin, isGuest: false };
  } else {
    const remote = await loginAccountOnServer(number, pin);
    if (remote.account) {
      account = {
        ...(known || {}),
        ...remote.account,
        mobile: remote.account.mobile || number,
        creatorMobile: remote.account.mobile || known?.creatorMobile || number,
        familyMembers: remote.account.familyMembers?.length
          ? remote.account.familyMembers
          : known?.familyMembers || [],
        loginPin: pin,
        isGuest: false,
      };
    } else if (known && knownActor && !knownPin && remote.status !== 401) {
      account = { ...known, loginPin: pin, isGuest: false };
    } else if (known || remote.status === 401) {
      return { ok: false, error: "Mobile or password does not match this account." };
    } else {
      return { ok: false, error: remote.error || "This mobile number is not registered." };
    }
  }
  const profile = accountProfileFromLogin({ account, mobile: number, delivery });
  profile.loginPin = pin;
  return { ok: true, profile: openAccount(profile, number) };
}
