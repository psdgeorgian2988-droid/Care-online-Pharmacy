import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPartnerPassword,
  normalizePartnerLoginId,
  partnerCreateCredentials,
  partnerLoginIdFromMobile,
  partnerPasswordError,
  publicPartner,
  verifyPartnerPassword,
} from "../server/partners.mjs";

test("partner login IDs are trimmed and case-insensitive", () => {
  assert.equal(normalizePartnerLoginId("  Ravi.Rider "), "ravi.rider");
});

test("partner password hashes verify and never leak on the public record", () => {
  const stored = hashPartnerPassword("Secret#123");
  assert.equal(verifyPartnerPassword("Secret#123", stored), true);
  assert.equal(verifyPartnerPassword("wrong-pass", stored), false);
  const published = publicPartner({
    id: "P-MED-01",
    name: "Ravi Kumar",
    role: "Medicine rider",
    kinds: ["medicine"],
    loginId: "ravi.rider",
    passwordHash: stored,
    pin: "1111",
  });
  assert.equal(published.hasLogin, true);
  assert.equal(published.loginId, "ravi.rider");
  assert.equal("passwordHash" in published, false);
  assert.equal("pin" in published, false);
});

test("a partner with no login yet cannot be treated as signed in", () => {
  const published = publicPartner({
    id: "P-LAB-01",
    name: "Neha Sharma",
    kinds: ["lab"],
  });
  assert.equal(published.hasLogin, false);
  assert.equal(published.loginId, "");
});

test("new partner login is the 10-digit mobile and the password is exactly 6 digits", () => {
  assert.equal(partnerLoginIdFromMobile(" 98765-43210 "), "9876543210");
  assert.equal(partnerLoginIdFromMobile("987654321"), "");
  assert.equal(partnerLoginIdFromMobile("98765432101"), "9876543210");
  assert.equal(partnerPasswordError("482915"), "");
  assert.equal(partnerPasswordError("12345"), "Password must be exactly 6 digits.");
  assert.equal(partnerPasswordError("1234567"), "Password must be exactly 6 digits.");
  assert.equal(partnerPasswordError("12ab56"), "Password must be exactly 6 digits.");
  assert.equal(partnerPasswordError("MediHome@26"), "Password must be exactly 6 digits.");
  assert.equal(partnerPasswordError("", { required: false }), "");
  const created = partnerCreateCredentials({
    mobile: "98765 43210",
    loginId: "custom-login",
    password: "654321",
  });
  assert.equal(created.ok, true);
  assert.equal(created.loginId, "9876543210");
  assert.equal(created.mobile, "9876543210");
  assert.equal(
    partnerCreateCredentials({ mobile: "9876543210", password: "12345" }).ok,
    false
  );
  assert.equal(
    partnerCreateCredentials({ mobile: "987654321", password: "123456" }).error,
    "Login ID is the 10-digit mobile number."
  );
});
