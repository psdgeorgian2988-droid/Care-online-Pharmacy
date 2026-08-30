import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPartnerPassword,
  normalizePartnerLoginId,
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
