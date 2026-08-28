import {
  isValidEmail,
  isValidMobile,
  maskMobile,
  normalizeEmail,
  normalizeMobile,
} from "./personFields.js";

export { maskMobile };

const OTP_KEY = "mediHomeAccountOtp";
const UNLOCK_KEY = "mediHomeAccountEditUnlock";
const OTP_MS = 10 * 60 * 1000;
const UNLOCK_MS = 30 * 60 * 1000;

const memory = {
  otp: null,
  unlock: null,
};

function storage() {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    /* ignore */
  }
  return null;
}

function readJson(key, fallback) {
  const store = storage();
  if (!store) return fallback;
  try {
    const parsed = JSON.parse(store.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  const store = storage();
  if (store) {
    if (value == null) store.removeItem(key);
    else store.setItem(key, JSON.stringify(value));
    return;
  }
  if (key === OTP_KEY) memory.otp = value;
  if (key === UNLOCK_KEY) memory.unlock = value;
}

function readOtp() {
  return storage() ? readJson(OTP_KEY, null) : memory.otp;
}

function readUnlock() {
  return storage() ? readJson(UNLOCK_KEY, null) : memory.unlock;
}

function randomOtp(options = {}) {
  return (
    String(options.code || "").replace(/\D/g, "").slice(0, 4) ||
    String(1000 + Math.floor(Math.random() * 9000))
  );
}

function normalizeChannels(channels) {
  return [...new Set(channels || [])].filter(
    (id) => id === "mobile" || id === "email"
  );
}

export function issueAccountOtp(target, options = {}) {
  const spec =
    typeof target === "string"
      ? { mobile: target, channels: ["mobile"], purpose: "edit" }
      : { channels: ["mobile"], purpose: "edit", ...(target || {}) };
  const channels = normalizeChannels(
    spec.channels?.length ? spec.channels : ["mobile"]
  );
  if (!channels.length) {
    return { ok: false, error: "Choose mobile, email, or both." };
  }

  const mobile = normalizeMobile(spec.mobile);
  const email = normalizeEmail(spec.email);
  if (channels.includes("mobile") && !isValidMobile(mobile)) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }
  if (channels.includes("email") && !isValidEmail(email)) {
    return { ok: false, error: "Enter a valid mail ID to send an email OTP." };
  }

  const payload = {
    mobile: isValidMobile(mobile) ? mobile : "",
    email: isValidEmail(email) ? email : "",
    channels,
    purpose: spec.purpose === "reset" ? "reset" : "edit",
    code: randomOtp(options),
    sentAt: Date.now(),
    expiresAt: Date.now() + OTP_MS,
    verified: false,
  };
  writeJson(OTP_KEY, payload);
  return { ok: true, ...payload };
}

export function peekAccountOtp() {
  const row = readOtp();
  if (!row || Date.now() > Number(row.expiresAt || 0)) return null;
  return row;
}

export function verifyAccountOtp(target, code) {
  const spec = typeof target === "string" ? { mobile: target } : { ...(target || {}) };
  const given = String(code || "").replace(/\D/g, "").slice(0, 4);
  const row = peekAccountOtp();
  if (!row) {
    return { ok: false, error: "OTP expired. Send a new one." };
  }

  if (row.purpose === "reset") {
    const number = normalizeMobile(spec.mobile);
    const email = normalizeEmail(spec.email);
    if (number && row.mobile && row.mobile !== number) {
      return { ok: false, error: "OTP was sent to a different mobile number." };
    }
    if (email && row.email && row.email !== email) {
      return { ok: false, error: "OTP was sent to a different mail ID." };
    }
    if (row.code !== given) {
      return { ok: false, error: "That OTP does not match." };
    }
    writeJson(OTP_KEY, { ...row, verified: true });
    return {
      ok: true,
      mobile: row.mobile,
      email: row.email,
      purpose: "reset",
    };
  }

  const number = normalizeMobile(spec.mobile);
  if (row.mobile !== number) {
    return { ok: false, error: "OTP was sent to a different mobile number." };
  }
  if (row.code !== given) {
    return { ok: false, error: "That OTP does not match." };
  }
  writeJson(OTP_KEY, null);
  writeJson(UNLOCK_KEY, { mobile: number, at: Date.now() });
  return { ok: true, mobile: number };
}

export function isAccountEditUnlocked(mobile) {
  const number = normalizeMobile(mobile);
  const row = readUnlock();
  if (!row || row.mobile !== number) return false;
  return Date.now() - Number(row.at || 0) < UNLOCK_MS;
}

export function clearAccountEditUnlock() {
  writeJson(OTP_KEY, null);
  writeJson(UNLOCK_KEY, null);
  memory.otp = null;
  memory.unlock = null;
}
