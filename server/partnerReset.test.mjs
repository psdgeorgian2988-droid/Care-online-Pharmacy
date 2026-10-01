import test from "node:test";
import assert from "node:assert/strict";
import {
  RESET_OTP_TTL_MS,
  RESET_SEND_LIMIT,
  createResetStore,
  confirmAdminPartnerReset,
  confirmPartnerForgotPassword,
  issuePartnerResetOtp,
  partnerResetClientBody,
  requestAdminPartnerReset,
  requestPartnerForgotPassword,
  verifyPartnerOtpHash,
  verifyPartnerResetOtp,
} from "./partnerReset.mjs";
import { sendPartnerOtpSms } from "./partnerSms.mjs";
import {
  hashPartnerPassword,
  partnerPasswordResetRecord,
  publicPartner,
  verifyPartnerPassword,
} from "./partners.mjs";

const MOBILE = "9876543210";
const OTP = "246813";

function memoryDeps(partner, store, extra = {}) {
  return {
    now: 1_700_000_000_000,
    code: OTP,
    env: {},
    findPartner: async () => partner,
    findPartnerByMobile: async () => partner,
    loadStore: async () => store,
    saveStore: async () => {},
    sendSms: async () => ({
      sent: false,
      gateway: false,
      message: "No SMS gateway is configured, so the OTP was not texted.",
    }),
    savePassword: async (id, record) => ({
      ok: true,
      partner: publicPartner({ ...partner, ...record }),
    }),
    ...extra,
  };
}

test("OTP is stored hashed and a correct code verifies once", () => {
  const store = createResetStore();
  const issued = issuePartnerResetOtp(
    store,
    { mobile: MOBILE, partnerId: "P-1", actor: "partner" },
    { now: 1_000, code: OTP }
  );
  assert.equal(issued.ok, true);
  const row = store.challenges[MOBILE];
  assert.equal(row.code, undefined);
  assert.notEqual(row.otpHash, OTP);
  assert.equal(verifyPartnerOtpHash(OTP, row.otpHash), true);
  assert.equal(verifyPartnerOtpHash("000000", row.otpHash), false);
  const wrong = verifyPartnerResetOtp(store, { mobile: MOBILE, code: "000000", actor: "partner" }, 2_000);
  assert.equal(wrong.ok, false);
  assert.equal(store.challenges[MOBILE].attempts, 1);
  const ok = verifyPartnerResetOtp(store, { mobile: MOBILE, code: OTP, actor: "partner" }, 2_000);
  assert.equal(ok.ok, true);
  assert.equal(store.challenges[MOBILE], undefined);
  const again = verifyPartnerResetOtp(store, { mobile: MOBILE, code: OTP, actor: "partner" }, 2_000);
  assert.match(again.error, /expired/i);
});

test("OTP expires after 10 minutes and too many guesses are cleared", () => {
  const store = createResetStore();
  const now = 5_000;
  issuePartnerResetOtp(store, { mobile: MOBILE, partnerId: "P-1", actor: "partner" }, { now, code: OTP });
  const expired = verifyPartnerResetOtp(
    store,
    { mobile: MOBILE, code: OTP, actor: "partner" },
    now + RESET_OTP_TTL_MS
  );
  assert.match(expired.error, /expired/i);

  issuePartnerResetOtp(store, { mobile: MOBILE, partnerId: "P-1", actor: "partner" }, { now, code: OTP });
  for (let i = 0; i < 4; i += 1) {
    const attempt = verifyPartnerResetOtp(
      store,
      { mobile: MOBILE, code: "111111", actor: "partner" },
      now + 1
    );
    assert.equal(attempt.error, "Incorrect OTP.");
  }
  const stillGood = verifyPartnerResetOtp(
    store,
    { mobile: MOBILE, code: OTP, actor: "partner" },
    now + 1
  );
  assert.equal(stillGood.ok, true);

  issuePartnerResetOtp(store, { mobile: MOBILE, partnerId: "P-1", actor: "partner" }, { now, code: OTP });
  let locked = null;
  for (let i = 0; i < 5; i += 1) {
    locked = verifyPartnerResetOtp(
      store,
      { mobile: MOBILE, code: "111111", actor: "partner" },
      now + 1
    );
  }
  assert.match(locked.error, /too many/i);
  assert.equal(store.challenges[MOBILE], undefined);
});

test("OTP requests are rate-limited and the public body hides the code", () => {
  const store = createResetStore();
  const now = 9_000;
  for (let i = 0; i < RESET_SEND_LIMIT; i += 1) {
    const issued = issuePartnerResetOtp(
      store,
      { mobile: MOBILE, partnerId: "P-1", actor: "admin" },
      { now: now + i, code: OTP }
    );
    assert.equal(issued.ok, true);
  }
  const blocked = issuePartnerResetOtp(
    store,
    { mobile: MOBILE, partnerId: "P-1", actor: "admin" },
    { now: now + 10, code: OTP }
  );
  assert.equal(blocked.status, 429);

  const hidden = partnerResetClientBody({
    maskedMobile: "98*****210",
    expiresAt: now,
    sms: { sent: false, gateway: false, message: "not texted" },
  });
  assert.equal("devOtp" in hidden, false);
  assert.equal(JSON.stringify(hidden).includes(OTP), false);
  const shown = partnerResetClientBody({
    maskedMobile: "98*****210",
    expiresAt: now,
    sms: { sent: false, gateway: false, message: "not texted" },
    devOtp: OTP,
  });
  assert.equal(shown.devOtp, OTP);
});

test("password reset stores a 6-digit hash the partner can use", () => {
  const bad = partnerPasswordResetRecord("12345", { resetBy: "partner" });
  assert.equal(bad.ok, false);
  assert.equal(partnerPasswordResetRecord("MediHome@26").ok, false);
  const record = partnerPasswordResetRecord("654321", {
    resetBy: "partner",
    resetAt: 1_700_000_000_000,
  });
  assert.equal(record.ok, true);
  assert.equal(verifyPartnerPassword("654321", record.passwordHash), true);
  assert.equal(verifyPartnerPassword("111111", record.passwordHash), false);
  const published = publicPartner({
    id: "P-1",
    name: "Asha",
    kinds: ["lab"],
    loginId: MOBILE,
    mobile: MOBILE,
    ...record,
  });
  assert.equal(published.passwordResetAt, 1_700_000_000_000);
  assert.equal(published.passwordResetBy, "partner");
  assert.equal(published.hasLogin, true);
  assert.equal("passwordHash" in published, false);
  assert.equal(published.password, undefined);
});

test("partner forgot flow verifies OTP and saves the new 6-digit password", async () => {
  const previous = hashPartnerPassword("111111");
  const partner = {
    id: "P-1",
    name: "Asha",
    kinds: ["lab"],
    loginId: MOBILE,
    mobile: MOBILE,
    passwordHash: previous,
  };
  const store = createResetStore();
  let saved = null;
  const deps = memoryDeps(partner, store, {
    env: { MEDIHOME_OTP_DEV: "1" },
    savePassword: async (id, record) => {
      saved = { id, record };
      return { ok: true, partner: publicPartner({ ...partner, ...record }) };
    },
  });
  const issued = await requestPartnerForgotPassword(MOBILE, deps);
  assert.equal(issued.ok, true);
  assert.equal(issued.body.smsSent, false);
  assert.equal(issued.body.devOtp, OTP);
  assert.equal(store.challenges[MOBILE].code, undefined);
  assert.equal(verifyPartnerPassword("111111", previous), true);

  const short = await confirmPartnerForgotPassword(
    { mobile: MOBILE, otp: OTP, password: "12345" },
    deps
  );
  assert.equal(short.ok, false);
  assert.ok(store.challenges[MOBILE]);

  const confirmed = await confirmPartnerForgotPassword(
    { mobile: MOBILE, otp: OTP, password: "909090" },
    deps
  );
  assert.equal(confirmed.ok, true);
  assert.equal(saved.id, "P-1");
  assert.equal(saved.record.passwordResetBy, "partner");
  assert.equal(verifyPartnerPassword("909090", saved.record.passwordHash), true);
  assert.equal(verifyPartnerPassword("111111", saved.record.passwordHash), false);
  assert.equal(confirmed.body.partner, undefined);
  assert.equal(JSON.stringify(confirmed.body).includes("909090"), false);
});

test("admin reset saves the password chosen before the OTP and shows the reset note", async () => {
  const partner = {
    id: "P-9",
    name: "Ravi",
    kinds: ["medicine"],
    loginId: MOBILE,
    mobile: MOBILE,
    passwordHash: hashPartnerPassword("111111"),
  };
  const store = createResetStore();
  let saved = null;
  const deps = memoryDeps(partner, store, {
    savePassword: async (id, record) => {
      saved = record;
      return { ok: true, partner: publicPartner({ ...partner, ...record }) };
    },
  });
  const issued = await requestAdminPartnerReset("P-9", "424242", deps);
  assert.equal(issued.body.smsSent, false);
  assert.equal("devOtp" in issued.body, false);
  assert.equal(JSON.stringify(issued.body).includes(OTP), false);
  assert.notEqual(store.challenges[MOBILE].pendingPasswordHash, "424242");
  const confirmed = await confirmAdminPartnerReset("P-9", OTP, deps);
  assert.equal(confirmed.ok, true);
  assert.equal(verifyPartnerPassword("424242", saved.passwordHash), true);
  assert.equal(saved.passwordResetBy, "admin");
  assert.equal(confirmed.body.partner.passwordResetAt, deps.now);
  assert.equal("passwordHash" in confirmed.body.partner, false);
});

test("SMS hook reports when no gateway is configured and only logs under MEDIHOME_OTP_DEV", async () => {
  const logs = [];
  const quiet = { info: (line) => logs.push(line) };
  const missing = await sendPartnerOtpSms(
    { mobile: MOBILE, code: OTP, purpose: "partner-forgot" },
    { env: {}, log: quiet }
  );
  assert.equal(missing.sent, false);
  assert.equal(missing.gateway, false);
  assert.equal(logs.length, 0);
  assert.equal(JSON.stringify(missing).includes(OTP), false);

  const dev = await sendPartnerOtpSms(
    { mobile: MOBILE, code: OTP, purpose: "partner-forgot" },
    { env: { MEDIHOME_OTP_DEV: "1" }, log: quiet }
  );
  assert.equal(dev.sent, false);
  assert.match(logs[0], new RegExp(OTP));

  let payload = null;
  const sent = await sendPartnerOtpSms(
    { mobile: MOBILE, code: OTP, purpose: "admin-partner-reset" },
    {
      env: { MEDIHOME_SMS_WEBHOOK: "https://sms.example/send" },
      log: quiet,
      fetchImpl: async (url, init) => {
        payload = { url, body: JSON.parse(init.body) };
        return { ok: true };
      },
    }
  );
  assert.equal(sent.sent, true);
  assert.equal(sent.gateway, true);
  assert.equal(payload.url, "https://sms.example/send");
  assert.equal(payload.body.mobile, MOBILE);
  assert.match(payload.body.text, new RegExp(OTP));
});
