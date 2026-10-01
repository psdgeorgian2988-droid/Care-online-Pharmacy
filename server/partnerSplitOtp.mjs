import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clampSplitPercent } from "../src/paymentSplit.js";
import { maskMobile } from "../src/personFields.js";
import { otpDevEnabled, sendPartnerOtpSms } from "./partnerSms.mjs";
import { findPartner, partnerRegisteredMobile, updatePartner } from "./partners.mjs";
import {
  RESET_OTP_TTL_MS,
  RESET_SEND_LIMIT,
  RESET_SEND_WINDOW_MS,
  RESET_VERIFY_LIMIT,
  generatePartnerResetOtp,
  hashPartnerOtp,
  partnerResetClientBody,
  verifyPartnerOtpHash,
} from "./partnerReset.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const storeFile = path.join(root, "data", "partner-split-otps.json");

export function createSplitOtpStore() {
  return { challenges: {}, sends: {} };
}

export function partnerRecordSplitAllowed(partner) {
  const kinds = Array.isArray(partner?.kinds) ? partner.kinds : [];
  return kinds.some((kind) => String(kind || "").toLowerCase() !== "lab");
}

function issueSplitOtp(store, { mobile, partnerId, partnerPercent } = {}, options = {}) {
  const now = Number(options.now ?? Date.now());
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
  store.challenges[partnerId] = {
    mobile,
    partnerId,
    partnerPercent,
    otpHash: hashPartnerOtp(code),
    expiresAt: now + RESET_OTP_TTL_MS,
    attempts: 0,
    issuedAt: now,
  };
  store.sends[mobile] = [...recent, now];
  return { ok: true, code, expiresAt: now + RESET_OTP_TTL_MS };
}

function verifySplitOtp(store, { partnerId, code } = {}, now = Date.now()) {
  const key = String(partnerId || "");
  const row = key ? store.challenges?.[key] : null;
  if (!row || Number(row.expiresAt) <= Number(now)) {
    if (key && row) delete store.challenges[key];
    return { ok: false, error: "OTP expired. Send a new one." };
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
  const partnerPercent = row.partnerPercent;
  delete store.challenges[key];
  return { ok: true, partnerPercent };
}

async function readSplitStore() {
  try {
    const parsed = JSON.parse(await readFile(storeFile, "utf8"));
    return {
      challenges:
        parsed?.challenges && typeof parsed.challenges === "object" ? parsed.challenges : {},
      sends: parsed?.sends && typeof parsed.sends === "object" ? parsed.sends : {},
    };
  } catch {
    return createSplitOtpStore();
  }
}

async function writeSplitStore(store) {
  await mkdir(path.dirname(storeFile), { recursive: true });
  const now = Date.now();
  const challenges = {};
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
  await writeFile(storeFile, `${JSON.stringify({ challenges, sends }, null, 2)}\n`);
}

function depsOf(overrides = {}) {
  return {
    now: Date.now(),
    code: "",
    env: process.env,
    findPartner,
    loadStore: readSplitStore,
    saveStore: writeSplitStore,
    sendSms: sendPartnerOtpSms,
    saveSplit: updatePartner,
    ...overrides,
  };
}

export async function requestAdminPartnerSplit(partnerId, partnerPercent, overrides = {}) {
  const deps = depsOf(overrides);
  const partner = await deps.findPartner(partnerId);
  if (!partner) return { ok: false, status: 404, error: "Partner not found." };
  if (!partnerRecordSplitAllowed(partner)) {
    return {
      ok: false,
      status: 400,
      error: "Lab split is set on each lab test, not on the partner.",
    };
  }
  const mobile = partnerRegisteredMobile(partner);
  if (!mobile) {
    return { ok: false, status: 400, error: "This partner has no registered mobile for an OTP." };
  }
  const percent = clampSplitPercent(partnerPercent);
  if (percent == null) {
    return { ok: false, status: 400, error: "Partner split must be between 0 and 100." };
  }
  const store = await deps.loadStore();
  const issued = issueSplitOtp(
    store,
    { mobile, partnerId: partner.id, partnerPercent: percent },
    { now: deps.now, code: deps.code }
  );
  if (!issued.ok) return { ok: false, status: issued.status || 400, error: issued.error };
  await deps.saveStore(store);
  const sms = await deps.sendSms(
    { mobile, code: issued.code, purpose: "partner-split" },
    { env: deps.env }
  );
  return {
    ok: true,
    status: 200,
    body: partnerResetClientBody({
      maskedMobile: maskMobile(mobile),
      expiresAt: issued.expiresAt,
      sms,
      devOtp: otpDevEnabled(deps.env) ? issued.code : "",
    }),
  };
}

export async function confirmAdminPartnerSplit(partnerId, otp, overrides = {}) {
  const deps = depsOf(overrides);
  const partner = await deps.findPartner(partnerId);
  if (!partner) return { ok: false, status: 404, error: "Partner not found." };
  const store = await deps.loadStore();
  const checked = verifySplitOtp(store, { partnerId: partner.id, code: otp }, deps.now);
  await deps.saveStore(store);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };
  const saved = await deps.saveSplit(partner.id, { partnerPercent: checked.partnerPercent });
  if (!saved.ok) return { ok: false, status: 400, error: saved.error };
  return {
    ok: true,
    status: 200,
    body: { ok: true, partner: saved.partner, message: "Split updated." },
  };
}
