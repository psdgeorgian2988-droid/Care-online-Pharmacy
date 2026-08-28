import test from "node:test";
import assert from "node:assert/strict";
import {
  clearAccountEditUnlock,
  isAccountEditUnlocked,
  issueAccountOtp,
  maskMobile,
  peekAccountOtp,
  verifyAccountOtp,
} from "./accountOtp.js";

test("account edit OTP unlocks only the verified creator mobile", () => {
  clearAccountEditUnlock();
  const sent = issueAccountOtp("9876543210", { code: "4821" });
  assert.equal(sent.ok, true);
  assert.equal(peekAccountOtp().code, "4821");
  assert.equal(verifyAccountOtp("9876543210", "0000").ok, false);
  assert.equal(isAccountEditUnlocked("9876543210"), false);
  assert.equal(verifyAccountOtp("9876543210", "4821").ok, true);
  assert.equal(isAccountEditUnlocked("9876543210"), true);
  assert.equal(isAccountEditUnlocked("9876500000"), false);
});

test("changing to a new mobile needs a fresh OTP on that number", () => {
  clearAccountEditUnlock();
  issueAccountOtp("9876543210", { code: "1111" });
  assert.equal(verifyAccountOtp("9876543210", "1111").ok, true);
  const next = issueAccountOtp("9988776655", { code: "2222" });
  assert.equal(next.ok, true);
  assert.equal(verifyAccountOtp("9876543210", "2222").ok, false);
  assert.equal(verifyAccountOtp("9988776655", "2222").ok, true);
  assert.equal(isAccountEditUnlocked("9988776655"), true);
});

test("mask keeps only the first two and last three digits", () => {
  assert.equal(maskMobile("9876543210"), "98*****210");
});

test("reset OTP can be sent to mobile, email, or both", () => {
  clearAccountEditUnlock();
  const both = issueAccountOtp(
    {
      mobile: "9876543210",
      email: "asha@medihome.in",
      channels: ["mobile", "email"],
      purpose: "reset",
    },
    { code: "3344" }
  );
  assert.equal(both.ok, true);
  assert.deepEqual(both.channels, ["mobile", "email"]);
  assert.equal(verifyAccountOtp({ mobile: "9876543210", email: "asha@medihome.in" }, "3344").ok, true);
  assert.equal(peekAccountOtp().verified, true);
  assert.equal(isAccountEditUnlocked("9876543210"), false);
});
