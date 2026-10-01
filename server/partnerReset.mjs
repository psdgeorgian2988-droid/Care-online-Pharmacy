import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { maskMobile } from "../src/personFields.js";
import { otpDevEnabled, sendPartnerOtpSms } from "./partnerSms.mjs";
import {
  findPartner,
  findPartnerByMobile,
  partnerLoginIdFromMobile,
  partnerPasswordResetRecord,
  partnerRegisteredMobile,
  savePartnerPasswordReset,
} from "./partners.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const storeFile = path.join(root, "data", "partner-reset-otps.json");

export const RESET_OTP_TTL_MS = 10 * 60 * 1000;
export const RESET_OTP_DIGITS = 6;
export const RESET_SEND_WINDOW_MS = 15 * 60 * 1000;
export const RESET_SEND_LIMIT = 5;
export const RESET_VERIFY_LIMIT = 5;

export function createResetStore() {
  return { challenges: {}, sends: {} };
}

export function hashPartnerOtp(code, salt = randomBytes(16).toString("hex")) {
  const hash = createHash("sha256").update(`${salt}:${String(code)}`).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPartnerOtpHash(code, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = createHash("sha256").update(`${salt}:${String(code)}`).digest("hex");
  const prev = Buffer.from(hash, "hex");
  const current = Buffer.from(next, "hex");
  if (prev.length !== current.length) return false;
  return timingSafeEqual(prev, current);
}

export function generatePartnerResetOtp(options = {}) {
  const forced = String(options.code || "").replace(/\D/g, "");
  if (forced.length === RESET_OTP_DIGITS) return forced;
  return String(randomInt(0, 1_000_000)).padStart(RESET_OTP_DIGITS, "0");
}

export function partnerResetClientBody({ maskedMobile, expiresAt, sms, devOtp = "" } = {}) {
  const body = {
    ok: true,
    maskedMobile: String(maskedMobile || ""),
    expiresAt: Number(expiresAt) || 0,
    smsSent: Boolean(sms?.sent),
    smsGateway: Boolean(sms?.gateway),
    message: String(sms?.message || ""),
  };
  const code = String(devOtp || "");
  if (/^\d{6}$/.test(code)) body.devOtp = code;
  return body;
}

export function issuePartnerResetOtp(store, input = {}, options = {}) {
  const now = Number(options.now ?? Date.now());
  const mobile = partnerLoginIdFromMobile(input.mobile);
  if (!mobile) {
    return { ok: false, status: 400, error: "Enter the 10-digit registered mobile number." };
  }
  if (!store.sends || typeof store.sends !== "object") store.sends = {};
  if (!store.challenges || typeof store.challenges !== "object") store.challenges = {};
  const recent = (Array.isArray(store.sends[mobile]) ? store.sends[mobile] : []).filter(
    (stamp) => now - Number(stamp) < RESET_SEND_WINDOW_MS
  );
  if (recent.length >= RESET_SEND_LIMIT) {
    store.sends[mobile] = recent;
    return { ok: false, status: 429, error: "Too many OTP requests. Try again in a few minutes." };
  }
  const code = generatePartnerResetOtp({ code: options.code });
  store.challenges[mobile] = {
    mobile,
    partnerId: String(input.partnerId || ""),
    actor: input.actor === "admin" ? "admin" : "partner",
    otpHash: hashPartnerOtp(code),
    pendingPasswordHash: String(input.pendingPasswordHash || ""),
    expiresAt: now + RESET_OTP_TTL_MS,
    attempts: 0,
    issuedAt: now,
  };
  store.sends[mobile] = [...recent, now];
  return { ok: true, code, expiresAt: now + RESET_OTP_TTL_MS };
}

export function verifyPartnerResetOtp(store, { mobile, code, actor, partnerId } = {}, now = Date.now()) {
  const key = partnerLoginIdFromMobile(mobile);
  const row = key ? store.challenges?.[key] : null;
  if (!row || Number(row.expiresAt) <= Number(now)) {
    if (key && row) delete store.challenges[key];
    return { ok: false, error: "OTP expired. Send a new one." };
  }
  if (partnerId && row.partnerId !== partnerId) {
    return { ok: false, error: "OTP expired. Send a new one." };
  }
  if (actor && row.actor !== actor) {
    if (row.actor === "admin") {
      return {
        ok: false,
        error: "This OTP belongs to a staff password reset. Ask MediHome staff to enter it.",
      };
    }
    return {
      ok: false,
      error: "This OTP was requested by the partner. They finish the reset on their login screen.",
    };
  }
  const given = String(code || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(given) || !verifyPartnerOtpHash(given, row.otpHash)) {
    row.attempts = Number(row.attempts || 0) + 1;
    if (row.attempts >= RESET_VERIFY_LIMIT) {
      delete store.challenges[key];
      return { ok: false, error: "Too many incorrect OTPs. Send a new one." };
    }
    return { ok: false, error: "Incorrect OTP." };
  }
  const pendingPasswordHash = String(row.pendingPasswordHash || "");
  delete store.challenges[key];
  return { ok: true, pendingPasswordHash, partnerId: row.partnerId, actor: row.actor };
}

async function readResetStore() {
  try {
    const parsed = JSON.parse(await readFile(storeFile, "utf8"));
    return {
      challenges:
        parsed?.challenges && typeof parsed.challenges === "object" ? parsed.challenges : {},
      sends: parsed?.sends && typeof parsed.sends === "object" ? parsed.sends : {},
    };
  } catch {
    return createResetStore();
  }
}

async function writeResetStore(store) {
  await mkdir(path.dirname(storeFile), { recursive: true });
  const challenges = {};
  const now = Date.now();
  for (const [key, row] of Object.entries(store?.challenges || {})) {
    if (row && Number(row.expiresAt) > now) challenges[key] = row;
  }
  const sends = {};
  for (const [key, stamps] of Object.entries(store?.sends || {})) {
    const recent = (Array.isArray(stamps) ? stamps : []).filter(
      (stamp) => now - Number(stamp) < RESET_SEND_WINDOW_MS
    );
    if (recent.length) sends[key] = recent;
  }
  await writeFile(
    storeFile,
    `${JSON.stringify({ challenges, sends }, null, 2)}\n`
  );
}

function depsOf(overrides = {}) {
  return {
    now: Date.now(),
    code: "",
    env: process.env,
    findPartnerByMobile,
    findPartner,
    loadStore: readResetStore,
    saveStore: writeResetStore,
    sendSms: sendPartnerOtpSms,
    savePassword: savePartnerPasswordReset,
    ...overrides,
  };
}

async function deliverResetOtp(deps, { mobile, code, purpose, expiresAt }) {
  const sms = await deps.sendSms(
    { mobile, code, purpose },
    { env: deps.env }
  );
  return partnerResetClientBody({
    maskedMobile: maskMobile(mobile),
    expiresAt,
    sms,
    devOtp: otpDevEnabled(deps.env) ? code : "",
  });
}

export async function requestPartnerForgotPassword(mobile, overrides = {}) {
  const deps = depsOf(overrides);
  const partner = await deps.findPartnerByMobile(mobile);
  if (!partner) {
    return { ok: false, status: 404, error: "No partner is registered with that mobile number." };
  }
  const registered = partnerRegisteredMobile(partner);
  if (!registered) {
    return { ok: false, status: 400, error: "This partner has no registered mobile for an OTP." };
  }
  const store = await deps.loadStore();
  const issued = issuePartnerResetOtp(
    store,
    { mobile: registered, partnerId: partner.id, actor: "partner" },
    { now: deps.now, code: deps.code }
  );
  if (!issued.ok) return { ok: false, status: issued.status || 400, error: issued.error };
  await deps.saveStore(store);
  const body = await deliverResetOtp(deps, {
    mobile: registered,
    code: issued.code,
    purpose: "partner-forgot",
    expiresAt: issued.expiresAt,
  });
  return { ok: true, status: 200, body };
}

export async function confirmPartnerForgotPassword({ mobile, otp, password } = {}, overrides = {}) {
  const deps = depsOf(overrides);
  const record = partnerPasswordResetRecord(password, { resetBy: "partner", resetAt: deps.now });
  if (!record.ok) return { ok: false, status: 400, error: record.error };
  const partner = await deps.findPartnerByMobile(mobile);
  if (!partner) {
    return { ok: false, status: 404, error: "No partner is registered with that mobile number." };
  }
  const registered = partnerRegisteredMobile(partner);
  const store = await deps.loadStore();
  const checked = verifyPartnerResetOtp(
    store,
    { mobile: registered, code: otp, actor: "partner", partnerId: partner.id },
    deps.now
  );
  await deps.saveStore(store);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };
  const saved = await deps.savePassword(partner.id, record);
  if (!saved.ok) return { ok: false, status: 400, error: saved.error };
  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      message: "Password reset.",
      passwordResetAt: saved.partner?.passwordResetAt || record.passwordResetAt,
    },
  };
}

export async function requestAdminPartnerReset(partnerId, password, overrides = {}) {
  const deps = depsOf(overrides);
  const partner = await deps.findPartner(partnerId);
  if (!partner) return { ok: false, status: 404, error: "Partner not found." };
  const mobile = partnerRegisteredMobile(partner);
  if (!mobile) {
    return { ok: false, status: 400, error: "This partner has no registered mobile for an OTP." };
  }
  const pending = partnerPasswordResetRecord(password, { resetBy: "admin", resetAt: deps.now });
  if (!pending.ok) return { ok: false, status: 400, error: pending.error };
  const store = await deps.loadStore();
  const issued = issuePartnerResetOtp(
    store,
    {
      mobile,
      partnerId: partner.id,
      actor: "admin",
      pendingPasswordHash: pending.passwordHash,
    },
    { now: deps.now, code: deps.code }
  );
  if (!issued.ok) return { ok: false, status: issued.status || 400, error: issued.error };
  await deps.saveStore(store);
  const body = await deliverResetOtp(deps, {
    mobile,
    code: issued.code,
    purpose: "admin-partner-reset",
    expiresAt: issued.expiresAt,
  });
  return { ok: true, status: 200, body };
}

export async function confirmAdminPartnerReset(partnerId, otp, overrides = {}) {
  const deps = depsOf(overrides);
  const partner = await deps.findPartner(partnerId);
  if (!partner) return { ok: false, status: 404, error: "Partner not found." };
  const mobile = partnerRegisteredMobile(partner);
  const store = await deps.loadStore();
  const checked = verifyPartnerResetOtp(
    store,
    { mobile, code: otp, actor: "admin", partnerId: partner.id },
    deps.now
  );
  await deps.saveStore(store);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };
  if (!checked.pendingPasswordHash) {
    return { ok: false, status: 400, error: "Send the OTP again with a new 6-digit password." };
  }
  const saved = await deps.savePassword(partner.id, {
    passwordHash: checked.pendingPasswordHash,
    passwordResetAt: deps.now,
    passwordResetBy: "admin",
  });
  if (!saved.ok) return { ok: false, status: 400, error: saved.error };
  return {
    ok: true,
    status: 200,
    body: { ok: true, partner: saved.partner, message: "Password reset." },
  };
}
