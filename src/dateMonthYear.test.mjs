import test from "node:test";
import assert from "node:assert/strict";
import { clampIsoDate, constrainDateParts, daysInRange, monthsInRange } from "./dateMonthYear.js";

test("appointment dates cannot pick months or days before the minimum", () => {
  const min = "2026-08-28";
  const max = "2026-09-04";
  assert.deepEqual(
    monthsInRange(min, max, "").map((row) => row.value),
    ["8", "9"]
  );
  assert.deepEqual(
    monthsInRange(min, max, "2026").map((row) => row.value),
    ["8", "9"]
  );
  assert.deepEqual(daysInRange(min, max, "", "8"), [28, 29, 30, 31]);
  assert.deepEqual(daysInRange(min, max, "2026", "8"), [28, 29, 30, 31]);
  assert.deepEqual(daysInRange(min, max, "2026", ""), []);
  assert.equal(clampIsoDate("2026-09-01", min, max), "2026-09-01");
  assert.deepEqual(
    constrainDateParts({ day: "15", month: "8", year: "2026" }, min, max),
    { day: "", month: "8", year: "2026", iso: "" }
  );
  assert.deepEqual(
    constrainDateParts({ day: "28", month: "8", year: "2026" }, min, max),
    { day: "28", month: "8", year: "2026", iso: "2026-08-28" }
  );
  assert.deepEqual(daysInRange(min, max, "2026", "9"), [1, 2, 3, 4]);
  assert.equal(clampIsoDate("2026-01-15", min, max), min);
  assert.equal(clampIsoDate("2026-09-01", min, max), "2026-09-01");
  assert.equal(clampIsoDate("2026-09-20", min, max), max);
});

test("date of birth cannot pick a future month in the current year", () => {
  const min = "1906-08-28";
  const max = "2026-08-28";
  assert.deepEqual(
    monthsInRange(min, max, "2026").map((row) => row.value),
    ["1", "2", "3", "4", "5", "6", "7", "8"]
  );
  assert.deepEqual(daysInRange(min, max, "2026", "8").slice(-3), [26, 27, 28]);
});
