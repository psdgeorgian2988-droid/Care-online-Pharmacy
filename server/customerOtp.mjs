import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { maskEmail, maskMobile } from "../src/personFields.js";
import { findCustomerAccount, findRegisteredAccountByEmail, rememberAccountDevice } from "./accounts.mjs";
import { customerChannelsConfigured, sendCustomerLoginCode } from "./customerChannels.mjs";
import { otpDevEnabled } from "./partnerSms.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const storeFile = path.join(root, "data", "customer-login-otps.json");

export const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
export const LOGIN_OTP_DIGITS = 6;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const SEND_LIMIT = 5;
const VERIFY_LIMIT = 5;

export function createLoginOtpStore() {
  return { challenges: {}, sends: {} };
}

export function hashLoginOtp(code, salt = randomBytes(16).toString("hex")) {
  const hash = createHash("sha256").update(`${salt}:${String(code)}`).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyLoginOtpHash(code, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = createHash("sha256").update(`${salt}:${String(code)}`).digest("hex");
  const prev = Buffer.from(hash, "hex");
  const current = Buffer.from(next, "hex");
  if (prev.length !== current.length) return false;
  return timingSafeEqual(prev, current);
}

export function generateLoginOtp(options = {}) {
  const forced = String(options.code || "").replace(/\D/g, "");
  if (forced.length === LOGIN_OTP_DIGITS) return forced;
  return String(randomInt(0, 1_000_000)).padStart(LOGIN_OTP_DIGITS, "0");
}

function mobileKey(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

function localHost(host) {
  const name = String(host || "").split(":")[0];
  return name === "localhost" || name === "127.0.0.1";
}

export function issueCustomerLoginOtp(store, mobile, options = {}) {
  const now = Number(options.now ?? Date.now());
  const key = mobileKey(mobile);
  if (!key) return { ok: false, status: 400, error: "Enter a valid 10-digit mobile number." };
  if (!store.sends || typeof store.sends !== "object") store.sends = {};
  if (!store.challenges || typeof store.challenges !== "object") store.challenges = {};
  const recent = (Array.isArray(store.sends[key]) ? store.sends[key] : []).filter(
    (stamp) => now - Number(stamp) < SEND_WINDOW_MS
  );
  if (recent.length >= SEND_LIMIT) {
    store.sends[key] = recent;
    return { ok: false, status: 429, error: "Too many login codes. Try again in a few minutes." };
  }
  const code = generateLoginOtp({ code: options.code });
  store.challenges[key] = {
    mobile: key,
    otpHash: hashLoginOtp(code),
    expiresAt: now + LOGIN_OTP_TTL_MS,
    attempts: 0,
    issuedAt: now,
  };
  store.sends[key] = [...recent, now];
  return { ok: true, code, mobile: key, expiresAt: now + LOGIN_OTP_TTL_MS };
}

export function checkCustomerLoginOtp(store, mobile, code, now = Date.now()) {
  const key = mobileKey(mobile);
  const row = key ? store.challenges?.[key] : null;
  if (!row || Number(row.expiresAt) <= Number(now)) {
    if (key && row) delete store.challenges[key];
    return { ok: false, status: 400, error: "Login code expired. Send a new one." };
  }
  const given = String(code || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(given) || !verifyLoginOtpHash(given, row.otpHash)) {
    row.attempts = Number(row.attempts || 0) + 1;
    if (row.attempts >= VERIFY_LIMIT) {
      delete store.challenges[key];
      return { ok: false, status: 400, error: "Too many incorrect codes. Send a new one." };
    }
    return { ok: false, status: 400, error: "That login code does not match." };
  }
  delete store.challenges[key];
  return { ok: true, mobile: key };
}

function sentLabels(delivery) {
  const labels = [];
  if (delivery?.sms?.sent) labels.push("message");
  if (delivery?.whatsapp?.sent) labels.push("WhatsApp");
  if (delivery?.mail?.sent) labels.push("mail");
  return labels;
}

export function loginCodeStatus({ registered, delivery, maskedMobile, maskedEmail }) {
  const labels = sentLabels(delivery);
  if (!labels.length) {
    return "The login code could not be sent yet. Try again in a moment.";
  }
  if (registered && delivery?.mail?.sent && maskedEmail) {
    return `Login code sent by ${labels.join(", ")} to ${maskedMobile} and ${maskedEmail}.`;
  }
  return `Login code sent by ${labels.join(", ")} to ${maskedMobile}.`;
}

async function readLoginOtpStore() {
  try {
    const parsed = JSON.parse(await readFile(storeFile, "utf8"));
    return {
      challenges: parsed?.challenges && typeof parsed.challenges === "object" ? parsed.challenges : {},
      sends: parsed?.sends && typeof parsed.sends === "object" ? parsed.sends : {},
    };
  } catch {
    return createLoginOtpStore();
  }
}

async function writeLoginOtpStore(store) {
  await mkdir(path.dirname(storeFile), { recursive: true });
  const now = Date.now();
  const challenges = {};
  for (const [key, row] of Object.entries(store?.challenges || {})) {
    if (row && Number(row.expiresAt) > now) challenges[key] = row;
  }
  const sends = {};
  for (const [key, stamps] of Object.entries(store?.sends || {})) {
    const recent = (Array.isArray(stamps) ? stamps : []).filter(
      (stamp) => now - Number(stamp) < SEND_WINDOW_MS
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
    host: "",
    findAccount: findCustomerAccount,
    findAccountByEmail: findRegisteredAccountByEmail,
    rememberDevice: rememberAccountDevice,
    loadStore: readLoginOtpStore,
    saveStore: writeLoginOtpStore,
    send: sendCustomerLoginCode,
    ...overrides,
  };
}

export async function requestCustomerLoginOtp(input, overrides = {}) {
  const deps = depsOf(overrides);
  const raw = typeof input === "string" ? { mobile: input } : input || {};
  let typed = mobileKey(raw.mobile);
  let account = typed ? await deps.findAccount(typed) : null;
  if (!account && raw.email && deps.findAccountByEmail) {
    account = await deps.findAccountByEmail(raw.email);
    typed = mobileKey(account?.mobile);
  }
  if (!typed) return { ok: false, status: 400, error: "Enter a valid 10-digit mobile number." };
  const registered = Boolean(account?.mobile);
  const email = registered ? String(account.email || "").trim() : "";
  const store = await deps.loadStore();
  const issued = issueCustomerLoginOtp(store, typed, { now: deps.now, code: deps.code });
  if (!issued.ok) return issued;
  await deps.saveStore(store);
  const delivery = await deps.send(
    { mobile: issued.mobile, email, code: issued.code, purpose: "customer-login" },
    { env: deps.env }
  );
  const reveal =
    otpDevEnabled(deps.env) ||
    (!customerChannelsConfigured(deps.env) &&
      localHost(deps.host) &&
      deps.env?.NODE_ENV !== "production");
  const body = {
    ok: true,
    registered,
    maskedMobile: maskMobile(issued.mobile),
    maskedEmail: email ? maskEmail(email) : "",
    expiresAt: issued.expiresAt,
    message: loginCodeStatus({
      registered,
      delivery,
      maskedMobile: maskMobile(issued.mobile),
      maskedEmail: email ? maskEmail(email) : "",
    }),
  };
  if (reveal) body.devOtp = issued.code;
  return { ok: true, status: 200, body };
}

export async function verifyCustomerLoginOtp({ mobile, email, otp, deviceId } = {}, overrides = {}) {
  const deps = depsOf(overrides);
  let key = mobileKey(mobile);
  let known = key ? await deps.findAccount(key) : null;
  if (!known && email && deps.findAccountByEmail) {
    known = await deps.findAccountByEmail(email);
    key = mobileKey(known?.mobile);
  }
  const store = await deps.loadStore();
  const checked = checkCustomerLoginOtp(store, key, otp, deps.now);
  await deps.saveStore(store);
  if (!checked.ok) return checked;
  if (deviceId && deps.rememberDevice) await deps.rememberDevice(checked.mobile, deviceId);
  const account = await deps.findAccount(checked.mobile);
  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      registered: Boolean(account?.mobile),
      mobile: checked.mobile,
      account: account || null,
    },
  };
}
