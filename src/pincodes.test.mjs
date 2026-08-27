import test from "node:test";
import assert from "node:assert/strict";
import {
  listCityDistrictMismatches,
  lookupPin,
  pinDirectoryStats,
} from "../server/pincodes.mjs";

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

test("PIN 124146 uses Jhajjar, not neighbouring Rohtak as city", () => {
  const row = lookupPin("124146");
  assert.equal(row.city, "Jhajjar");
  assert.equal(row.district, "Jhajjar");
  assert.equal(row.state, "Haryana");
});

test("PIN 124001 keeps Rohtak city with Rohtak district", () => {
  const row = lookupPin("124001");
  assert.equal(row.city, "Rohtak");
  assert.equal(row.district, "Rohtak");
});

test("PIN 122001 uses Gurugram for both city and district", () => {
  const row = lookupPin("122001");
  assert.equal(row.city, "Gurugram");
  assert.equal(row.district, "Gurugram");
});

test("no PIN uses another district in the same state as its city", () => {
  const mismatches = listCityDistrictMismatches();
  assert.equal(
    mismatches.length,
    0,
    mismatches
      .slice(0, 15)
      .map((row) => `${row.pin} city=${row.city} district=${row.district}`)
      .join("\n")
  );
});
