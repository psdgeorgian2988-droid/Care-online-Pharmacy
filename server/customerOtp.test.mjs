import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkCustomerLoginOtp,
  createLoginOtpStore,
  issueCustomerLoginOtp,
  requestCustomerLoginOtp,
  verifyCustomerLoginOtp,
} from "./customerOtp.mjs";

function memoryStore() {
  const state = createLoginOtpStore();
  return {
    state,
    async loadStore() {
      return state;
    },
    async saveStore(next) {
      state.challenges = next.challenges;
      state.sends = next.sends;
    },
  };
}

test("a login code is checked once and then cannot be reused", () => {
  const store = createLoginOtpStore();
  const issued = issueCustomerLoginOtp(store, "9876543210", { code: "246810", now: 1_000 });
  assert.equal(issued.ok, true);
  assert.equal(checkCustomerLoginOtp(store, "9876543210", "246810", 2_000).ok, true);
  assert.equal(checkCustomerLoginOtp(store, "9876543210", "246810", 2_000).ok, false);
});

test("login code goes to the typed mobile and the registered mail ID", async () => {
  const sent = [];
  const memory = memoryStore();
  const result = await requestCustomerLoginOtp("9876543210", {
    now: 5_000,
    code: "135790",
    env: { NODE_ENV: "production" },
    host: "medihome.co.in",
    findAccount: async () => ({ mobile: "9876543210", name: "Asha", email: "asha@medihome.in" }),
    loadStore: memory.loadStore,
    saveStore: memory.saveStore,
    send: async (payload) => {
      sent.push(payload);
      return {
        sms: { sent: true, configured: true },
        whatsapp: { sent: true, configured: true },
        mail: { sent: true, configured: true },
      };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.body.registered, true);
  assert.equal(sent[0].mobile, "9876543210");
  assert.equal(sent[0].email, "asha@medihome.in");
  assert.equal(sent[0].code, "135790");
  assert.equal(result.body.devOtp, undefined);
  assert.match(result.body.message, /message, WhatsApp, mail/);
});

test("a new mobile can verify the code and is not treated as an existing account", async () => {
  const memory = memoryStore();
  const overrides = {
    now: 5_000,
    code: "135790",
    env: { NODE_ENV: "production" },
    host: "medihome.co.in",
    findAccount: async () => null,
    loadStore: memory.loadStore,
    saveStore: memory.saveStore,
    send: async () => ({
      sms: { sent: true, configured: true },
      whatsapp: { sent: false, configured: false },
      mail: { sent: false, skipped: true },
    }),
  };
  const sent = await requestCustomerLoginOtp("9810011100", overrides);
  assert.equal(sent.body.registered, false);
  const checked = await verifyCustomerLoginOtp(
    { mobile: "9810011100", otp: "135790" },
    overrides
  );
  assert.equal(checked.ok, true);
  assert.equal(checked.body.registered, false);
  assert.equal(checked.body.account, null);
});
