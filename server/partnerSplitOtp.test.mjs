import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmAdminPartnerSplit,
  createSplitOtpStore,
  partnerRecordSplitAllowed,
  requestAdminPartnerSplit,
} from "./partnerSplitOtp.mjs";

const MOBILE = "9876543210";
const OTP = "246813";

function memoryDeps(partner, store, extra = {}) {
  return {
    now: 1_700_000_000_000,
    code: OTP,
    env: {},
    findPartner: async () => partner,
    loadStore: async () => store,
    saveStore: async () => {},
    sendSms: async () => ({
      sent: false,
      gateway: false,
      message: "No SMS gateway is configured, so the OTP was not texted.",
    }),
    saveSplit: async (_id, body) => ({
      ok: true,
      partner: { ...partner, partnerPercent: body.partnerPercent },
    }),
    ...extra,
  };
}

test("split update OTP is stored and only a matching code sets the percent", async () => {
  const store = createSplitOtpStore();
  const partner = {
    id: "P-1",
    name: "Amit",
    kinds: ["medicine"],
    mobile: MOBILE,
    loginId: MOBILE,
    partnerPercent: 60,
  };
  const deps = memoryDeps(partner, store);
  const issued = await requestAdminPartnerSplit("P-1", 72, deps);
  assert.equal(issued.ok, true);
  assert.equal(issued.body.smsSent, false);
  assert.match(issued.body.message, /not texted/);
  assert.equal(store.challenges["P-1"].partnerPercent, 72);
  assert.equal(store.challenges["P-1"].code, undefined);

  const wrong = await confirmAdminPartnerSplit("P-1", "000000", deps);
  assert.equal(wrong.ok, false);
  assert.equal(store.challenges["P-1"].partnerPercent, 72);

  const confirmed = await confirmAdminPartnerSplit("P-1", OTP, deps);
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.body.partner.partnerPercent, 72);
  assert.equal(store.challenges["P-1"], undefined);
});

test("a lab-only partner cannot take a record-level split update", async () => {
  assert.equal(partnerRecordSplitAllowed({ kinds: ["lab"] }), false);
  assert.equal(partnerRecordSplitAllowed({ kinds: ["lab", "radiology"] }), true);
  const store = createSplitOtpStore();
  const issued = await requestAdminPartnerSplit(
    "P-LAB",
    70,
    memoryDeps({ id: "P-LAB", kinds: ["lab"], mobile: MOBILE, loginId: MOBILE }, store)
  );
  assert.equal(issued.ok, false);
  assert.match(issued.error, /lab test/i);
});
