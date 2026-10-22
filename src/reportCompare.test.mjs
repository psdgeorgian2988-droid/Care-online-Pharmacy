import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanReportValues,
  compareReportPair,
  groupReportsByName,
  isImagingReportName,
  panelForReport,
  parseReportNumber,
} from "./reportCompare.js";

test("report numbers ignore units and thousands commas", () => {
  assert.equal(parseReportNumber("13.2 g/dL"), 13.2);
  assert.equal(parseReportNumber("13,200"), 13200);
  assert.equal(parseReportNumber("negative"), null);
  assert.equal(cleanReportValues([{ name: "Hb", value: "11.5", unit: "g/dL" }, { name: "", value: "1" }]).length, 1);
});

test("reports stay grouped by name with the latest date first", () => {
  const groups = groupReportsByName([
    { kind: "lab", testName: "Complete Blood Count (CBC)", date: "2026-01-01", savedAt: "2026-01-01" },
    { kind: "lab", testName: "Lipid Profile", date: "2026-08-01", savedAt: "2026-08-01" },
    { kind: "lab", testName: "Complete Blood Count (CBC)", date: "2026-09-01", savedAt: "2026-09-01" },
    { kind: "radiology", testName: "MRI Brain", date: "2026-07-01", savedAt: "2026-07-01" },
    { kind: "prescription", testName: "Prescription", date: "2026-12-01" },
  ]);
  assert.deepEqual(
    groups.map((group) => group.name),
    ["Complete Blood Count (CBC)", "Lipid Profile", "MRI Brain"]
  );
  assert.deepEqual(
    groups[0].reports.map((row) => row.date),
    ["2026-09-01", "2026-01-01"]
  );
});

test("numeric lab rows compare the previous report with the current one", () => {
  const previous = {
    kind: "lab",
    values: [
      { name: "Haemoglobin", value: "12.1", unit: "g/dL" },
      { name: "WBC", value: "7000", unit: "/µL" },
    ],
  };
  const current = {
    kind: "lab",
    values: [
      { name: "Haemoglobin", value: "13.4", unit: "g/dL" },
      { name: "WBC", value: "6400", unit: "/µL" },
      { name: "Platelets", value: "2,10,000" },
    ],
  };
  const rows = compareReportPair(current, previous);
  assert.equal(rows[0].previous, 12.1);
  assert.equal(rows[0].current, 13.4);
  assert.equal(rows[1].previous, 7000);
  assert.equal(rows[1].current, 6400);
  assert.equal(rows[2].previous, null);
  assert.equal(rows[2].current, 210000);
});

test("imaging reports are stored for viewing and are not charted", () => {
  assert.equal(isImagingReportName("MRI Brain"), true);
  assert.equal(isImagingReportName("Complete Blood Count (CBC)"), false);
  assert.equal(panelForReport("Complete Blood Count (CBC)").some((row) => row.name === "Haemoglobin"), true);
  assert.deepEqual(
    compareReportPair(
      { kind: "radiology", testName: "MRI Brain", values: [{ name: "Size", value: "2" }] },
      { kind: "radiology", values: [{ name: "Size", value: "1" }] }
    ),
    []
  );
});
