import test from "node:test";
import assert from "node:assert/strict";

if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

if (!globalThis.CustomEvent) {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
}

if (!globalThis.window) {
  globalThis.window = {
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };
}

const {
  awardOnce,
  loadWallet,
  referralShareText,
  referralWhatsAppHref,
  saveReferralInvite,
  spendPoints,
} = await import("./pointsStore.js");

test("family invite does not spend points and has no relation", () => {
  localStorage.clear();
  const before = loadWallet();
  const result = saveReferralInvite({ name: "Asha", mobile: "9876543210" });
  assert.equal(result.ok, true);
  assert.equal(result.wallet.balance, before.balance);
  assert.equal(result.referral.name, "Asha");
  assert.equal(result.referral.mobile, "9876543210");
  assert.equal("relation" in result.referral, false);
  assert.equal(result.referral.pointsUsed, 0);
  assert.match(result.referral.id, /^MH-FAM-\d{4}$/);
});

test("spendPoints deducts a redeem once per key", () => {
  localStorage.clear();
  awardOnce("seed", 510, "Seed");
  const first = spendPoints(510, "Redeemed on lab", "redeem:lab-1");
  assert.equal(first.ok, true);
  assert.equal(first.spent, 510);
  assert.equal(first.wallet.balance, 0);
  const again = spendPoints(510, "Redeemed on lab", "redeem:lab-1");
  assert.equal(again.already, true);
  assert.equal(again.spent, 0);
  assert.equal(loadWallet().balance, 0);
});

test("WhatsApp invite includes the app download link", () => {
  const referral = { name: "Asha", mobile: "9876543210", id: "MH-FAM-1234" };
  const text = referralShareText(referral, "Anita");
  assert.match(text, /Asha/);
  assert.match(text, /https:\/\/medihome\.co\.in/);
  assert.match(text, /Download the MediHome app/);
  assert.doesNotMatch(text, /spouse|relation/i);
  const href = referralWhatsAppHref(referral, "Anita");
  assert.match(href, /^https:\/\/wa\.me\/919876543210\?text=/);
  assert.match(href, /medihome\.co\.in/);
});
