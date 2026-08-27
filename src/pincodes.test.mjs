import test from "node:test";
import assert from "node:assert/strict";
import { lookupPin, pinDirectoryStats } from "../server/pincodes.mjs";

test("backend directory includes all-India PIN codes", () => {
  const stats = pinDirectoryStats();
  assert.equal(stats.pinCount > 19000, true);
  assert.equal(stats.prefixCount > 300, true);
});

test("known PINs fill city, district and state", () => {
  const delhi = lookupPin("110016");
  assert.equal(delhi.city, "New Delhi");
  assert.equal(delhi.district.includes("Delhi"), true);
  assert.equal(delhi.state, "Delhi");
  assert.equal(Number.isFinite(delhi.lat), true);

  const mumbai = lookupPin("400001");
  assert.equal(mumbai.city, "Mumbai");
  assert.equal(mumbai.state, "Maharashtra");

  const bengaluru = lookupPin("560001");
  assert.equal(bengaluru.city, "Bengaluru");
  assert.equal(bengaluru.state, "Karnataka");
});

test("unknown 6-digit PIN still resolves from the 3-digit prefix", () => {
  const row = lookupPin("110099");
  assert.equal(row.city, "New Delhi");
  assert.equal(row.state, "Delhi");
  assert.equal(row.approximate, true);
});

test("short or empty PIN is not a match", () => {
  assert.equal(lookupPin("11001"), null);
  assert.equal(lookupPin(""), null);
});
