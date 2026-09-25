import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPharmacyReport,
  pharmacyReportDayKey,
} from "./pharmacyReport.js";

test("pharmacy report groups order counts day-wise and values till date", () => {
  const now = Date.parse("2026-09-23T10:00:00+05:30");
  const report = buildPharmacyReport(
    [
      { id: "a", date: "2026-09-23", bookedAtMs: now, total: 100 },
      { id: "b", bookedAtMs: now, total: 50 },
      { id: "c", bookedAtMs: Date.parse("2026-09-22T09:00:00+05:30"), total: 80 },
      { id: "d", trackStatus: "declined", bookedAtMs: now, total: 999 },
    ],
    now
  );
  assert.equal(pharmacyReportDayKey(now, now), "2026-09-23");
  assert.equal(report.today.count, 2);
  assert.equal(report.today.value, 150);
  assert.equal(report.tillDate.count, 3);
  assert.equal(report.tillDate.value, 230);
  assert.equal(report.days[0].day, "2026-09-23");
  assert.equal(report.days[1].count, 1);
  assert.equal(report.days[1].value, 80);
});
