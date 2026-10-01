import { isValidMobile, maskMobile, normalizeMobile } from "./personFields.js";

export const SPLIT_OTP_TTL_MS = 10 * 60 * 1000;
export const SPLIT_OTP_DIGITS = 6;

export function normalizeSplitOtpMobile(value) {
  return normalizeMobile(value);
}

export function isSplitOtpMobile(value) {
  return isValidMobile(value);
}

export function maskSplitOtpMobile(value) {
  return maskMobile(value);
}

export function generateSplitOtpCode(options = {}) {
  const forced = String(options.code || "").replace(/\D/g, "").slice(0, SPLIT_OTP_DIGITS);
  if (forced.length === SPLIT_OTP_DIGITS) return forced;
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function defaultSplitOtpMobile(env = {}) {
  const fromEnv = normalizeSplitOtpMobile(env.MEDIHOME_SPLIT_OTP_MOBILE);
  return isSplitOtpMobile(fromEnv) ? fromEnv : "";
}

export function splitOtpExpiry(now = Date.now(), ttl = SPLIT_OTP_TTL_MS) {
  return Number(now) + Number(ttl);
}

export function isSplitOtpExpired(expiresAt, now = Date.now()) {
  return Number(expiresAt || 0) <= Number(now);
}
