import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  changePartnerPassword,
  createPartner,
  generatePartnerPassword,
  hashPartnerPassword,
  normalizePartnerLoginId,
  partnerLogin,
  publicPartner,
  resetPartnerPassword,
  verifyPartnerPassword,
} from "../server/partners.mjs";

test("partner login IDs are trimmed and case-insensitive", () => {
  assert.equal(normalizePartnerLoginId("  Ravi.Rider "), "ravi.rider");
});

test("generated first passwords are eight-plus characters", () => {
  const password = generatePartnerPassword();
  assert.ok(password.length >= 10);
  assert.match(password, /^Mh/);
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

async function withTempPartners(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mh-pt-"));
  const file = path.join(dir, "partners.json");
  await writeFile(file, JSON.stringify({ partners: [] }));
  const prev = process.env.MEDIHOME_PARTNERS_FILE;
  process.env.MEDIHOME_PARTNERS_FILE = file;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.MEDIHOME_PARTNERS_FILE;
    else process.env.MEDIHOME_PARTNERS_FILE = prev;
    await rm(dir, { recursive: true, force: true });
  }
}

const pharmacyBody = {
  kinds: ["medicine"],
  businessName: "Care Medicos",
  contactName: "Ravi Kumar",
  mobile: "9810012345",
  email: "ravi.kumar@caremedicos.in",
  houseNo: "12",
  society: "Green Park",
  pinCode: "110016",
  city: "New Delhi",
  district: "New Delhi",
  state: "Delhi",
  accountName: "Care Medicos",
  accountNumber: "12345678901",
  ifsc: "HDFC0001234",
};

test("creating a pharmacy partner issues a login ID and first password", async () => {
  await withTempPartners(async () => {
    const created = await createPartner(pharmacyBody);
    assert.equal(created.ok, true);
    assert.equal(created.loginId, "ravikumar.2345");
    assert.ok(created.password.length >= 8);
    assert.equal(created.partner.hasLogin, true);
    assert.equal(created.partner.mustChangePassword, true);
    assert.equal(created.partner.contactName, "Ravi Kumar");
    assert.equal(created.partner.role, "Pharmacy");

    const byId = await partnerLogin(created.loginId, created.password);
    const byMobile = await partnerLogin("9810012345", created.password);
    const byEmail = await partnerLogin("ravi.kumar@caremedicos.in", created.password);
    assert.ok(byId?.token);
    assert.ok(byMobile?.token);
    assert.ok(byEmail?.token);

    const changed = await changePartnerPassword(created.partner.id, {
      currentPassword: created.password,
      newPassword: "NewPass#12",
    });
    assert.equal(changed.ok, true);
    assert.equal(changed.partner.mustChangePassword, false);
    assert.equal(await partnerLogin(created.loginId, created.password), null);
    assert.ok(await partnerLogin(created.loginId, "NewPass#12"));

    const reset = await resetPartnerPassword(created.partner.id);
    assert.equal(reset.ok, true);
    assert.ok(await partnerLogin(created.loginId, reset.password));
  });
});


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
