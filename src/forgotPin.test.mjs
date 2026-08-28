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

const { clearAccountEditUnlock } = await import("./accountOtp.js");
const { profileLoginPin } = await import("./loginPin.js");
const {
  confirmResetOtp,
  lookupResetAccount,
  resetOtpChannels,
  saveResetLoginPin,
  sendResetOtp,
} = await import("./forgotPin.js");
const { readUserProfile } = await import("./addressFields.js");

function seedAccount() {
  localStorage.setItem(
    "mediHomeUser",
    JSON.stringify({
      name: "Asha",
      mobile: "9876543210",
      creatorMobile: "9876543210",
      email: "asha@medihome.in",
      pinCode: "110001",
      loginPin: "",
      gender: "F",
      dob: "1990-01-01",
      age: "36",
      familyMembers: [],
    })
  );
}

test("forgot PIN finds the account by mobile or email and OTP channels", () => {
  localStorage.clear();
  clearAccountEditUnlock();
  seedAccount();

  assert.equal(lookupResetAccount({}).ok, false);
  const byMobile = lookupResetAccount({ mobile: "9876543210" });
  assert.equal(byMobile.ok, true);
  const byEmail = lookupResetAccount({ email: "asha@medihome.in" });
  assert.equal(byEmail.ok, true);
  assert.equal(lookupResetAccount({ email: "other@medihome.in" }).ok, false);

  const channels = resetOtpChannels(byMobile.profile, byMobile.actor);
  assert.deepEqual(
    channels.map((row) => row.id),
    ["mobile", "email"]
  );
});

test("OTP on mobile and email can set a new login PIN without changing delivery PIN", () => {
  localStorage.clear();
  clearAccountEditUnlock();
  seedAccount();

  const found = lookupResetAccount({ mobile: "9876543210", email: "asha@medihome.in" });
  const sent = sendResetOtp(
    { profile: found.profile, actor: found.actor, channels: ["mobile", "email"] },
    { code: "4821" }
  );
  assert.equal(sent.ok, true);
  assert.deepEqual(sent.channels, ["mobile", "email"]);
  assert.equal(confirmResetOtp("0000").ok, false);
  assert.equal(saveResetLoginPin("998877", "998877").ok, false);
  assert.equal(confirmResetOtp("4821").ok, true);
  const saved = saveResetLoginPin("998877", "998877");
  assert.equal(saved.ok, true);

  const profile = readUserProfile();
  assert.equal(profile.loginPin, "998877");
  assert.equal(profile.pinCode, "110001");
  assert.equal(profileLoginPin(profile), "998877");
});
