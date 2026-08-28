import { readUserProfile } from "./addressFields.js";
import {
  issueAccountOtp,
  peekAccountOtp,
  clearAccountEditUnlock,
  verifyAccountOtp,
} from "./accountOtp.js";
import { findAccountActor, holderActor } from "./familyAccount.js";
import { normalizeLoginPin } from "./loginPin.js";
import {
  accountCreatorMobile,
  isValidEmail,
  isValidMobile,
  maskEmail,
  maskMobile,
  normalizeEmail,
  normalizeMobile,
  pickEmail,
} from "./personFields.js";

export function lookupResetAccount({ mobile = "", email = "" } = {}) {
  const profile = readUserProfile();
  if (!profile.mobile) {
    return { ok: false, error: "No account found. Please register first." };
  }

  const wantMobile = normalizeMobile(mobile);
  const wantEmail = normalizeEmail(email);
  if (!wantMobile && !wantEmail) {
    return {
      ok: false,
      error: "Enter the mobile number or mail ID on this account.",
    };
  }

  let actor = null;
  if (wantMobile) {
    if (!isValidMobile(wantMobile)) {
      return { ok: false, error: "Enter a valid 10-digit mobile number." };
    }
    actor = findAccountActor(profile, wantMobile);
    if (!actor) {
      return { ok: false, error: "Mobile number does not match this account." };
    }
  }
  if (wantEmail) {
    if (!isValidEmail(wantEmail)) {
      return { ok: false, error: "Enter a valid mail ID." };
    }
    if (pickEmail(profile) !== wantEmail) {
      return { ok: false, error: "Mail ID does not match this account." };
    }
    actor = actor || holderActor(profile);
  }

  return { ok: true, profile, actor };
}

export function resetOtpChannels(profile = {}, actor = null) {
  const channels = [];
  const mobile = actor?.mobile || accountCreatorMobile(profile);
  if (isValidMobile(mobile)) {
    channels.push({
      id: "mobile",
      label: "Mobile",
      value: mobile,
      masked: maskMobile(mobile),
    });
  }
  const email = pickEmail(profile);
  if (isValidEmail(email)) {
    channels.push({
      id: "email",
      label: "Email",
      value: email,
      masked: maskEmail(email),
    });
  }
  return channels;
}

export function sendResetOtp(
  { profile, actor, channels } = {},
  options = {}
) {
  const selected = [...new Set(channels || [])].filter(
    (id) => id === "mobile" || id === "email"
  );
  if (!selected.length) {
    return { ok: false, error: "Choose mobile, email, or both." };
  }
  const mobile = actor?.mobile || accountCreatorMobile(profile);
  const email = pickEmail(profile);
  return issueAccountOtp(
    { mobile, email, channels: selected, purpose: "reset" },
    options
  );
}

export function confirmResetOtp(code) {
  const row = peekAccountOtp();
  if (!row || row.purpose !== "reset") {
    return { ok: false, error: "OTP expired. Send a new one." };
  }
  return verifyAccountOtp({ mobile: row.mobile, email: row.email }, code);
}

export function isResetOtpVerified() {
  const row = peekAccountOtp();
  return Boolean(row && row.purpose === "reset" && row.verified);
}

export function saveResetLoginPin(pin, confirm) {
  const next = normalizeLoginPin(pin);
  if (!next) {
    return { ok: false, error: "Enter a new 6-digit PIN." };
  }
  if (String(pin || "") !== String(confirm || "")) {
    return { ok: false, error: "PINs do not match." };
  }
  if (!isResetOtpVerified()) {
    return { ok: false, error: "Verify the OTP before changing your PIN." };
  }
  const previous = readUserProfile();
  if (!previous.mobile) {
    return { ok: false, error: "No account found. Please register first." };
  }
  const profile = { ...previous, loginPin: next };
  localStorage.setItem("mediHomeUser", JSON.stringify(profile));
  clearAccountEditUnlock();
  return { ok: true, profile };
}
