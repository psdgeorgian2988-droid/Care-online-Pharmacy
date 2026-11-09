import assert from "node:assert/strict";
import test from "node:test";
import { catalogLabIdForPartner, withCommonLabPanel } from "./commonLabPanel.js";
import { barcodeBars, newAccession, normalizeReportResults, parseAnalyzerFeed } from "./labAccession.js";
import { diagnosticStepLabel, sampleCollectedFields } from "./labPipeline.js";

test("listed labs receive the common panel, and Metropolis keeps its directory", () => {
  const labs = withCommonLabPanel();
  const max = labs.find((row) => row.id === "max-healthcare");
  const cbc = max.tests.filter((row) => row.id === "cbc");
  assert.equal(cbc.length, 1);
  assert.equal(cbc[0].price, 449);
  assert.ok(max.tests.some((row) => row.id === "dengue"));
  const metropolis = labs.find((row) => row.id === "metropolis");
  assert.equal(metropolis.tests.length, 3362);
  assert.equal(metropolis.tests[0].code, "D8420");
  assert.equal(metropolis.tests[0].price, 3500);
  assert.match(metropolis.tests[0].instruction, /Serum/);
  assert.equal(metropolis.tests.some((row) => row.id === "dengue"), false);
  const pathcare = labs.find((row) => row.id === "pathcare");
  assert.equal(pathcare.tests.length, 2198);
  assert.equal(pathcare.tests.some((row) => row.id === "dengue"), false);
  const acacia = pathcare.tests.find((row) => row.code === "AL001");
  assert.equal(acacia.name, "Acacia");
  assert.equal(acacia.price, 990);
  assert.match(acacia.instruction, /Serum/);
  assert.equal(acacia.prepType, "catalogue");
  assert.equal(acacia.labId, "pathcare");
  assert.equal(metropolis.tests.some((row) => row.code === "AL001" || row.labId === "pathcare"), false);
  assert.equal(pathcare.tests.some((row) => row.code === "D8420" || row.labId === "metropolis"), false);
  const healthians = labs.find((row) => row.id === "healthians");
  assert.equal(healthians.name, "Healthians");
  assert.equal(healthians.tests.find((row) => row.id === "cbc").price, 390);
  assert.equal(healthians.tests.find((row) => row.id === "hi-2026-advance-plus").price, 2009);
  assert.ok(healthians.tests.some((row) => row.id === "dengue"));
  assert.equal(healthians.tests.some((row) => row.code === "D8420" || row.code === "AL001"), false);
  assert.equal(healthians.tests.some((row) => row.labId === "metropolis" || row.labId === "pathcare"), false);
});

test("a Metropolis partner adds tests onto the Metropolis catalogue", () => {
  assert.equal(catalogLabIdForPartner({ name: "Metropolis Healthcare" }), "metropolis");
  assert.equal(catalogLabIdForPartner({ name: "City Lab" }), "others");
  assert.equal(catalogLabIdForPartner({ catalogLabId: "lal-pathlabs", name: "Other" }), "lal-pathlabs");
});

test("sample collection creates a lab accession barcode", () => {
  const fields = sampleCollectedFields({ kind: "lab", requestId: "MH-LAB-1" }, 1_700_000_000_000);
  assert.equal(fields.trackStatus, "sample_collected");
  assert.match(fields.accessionNo, /^MH-LAB-\d{8}-\d{4}$/);
  assert.ok(barcodeBars(fields.accessionNo).length > 10);
  assert.equal(fields.collectorLive, false);
  const scan = sampleCollectedFields({ kind: "radiology" }, 1_700_000_000_000);
  assert.equal(scan.status, "Scan completed");
  assert.match(scan.accessionNo, /^MH-RAD-/);
});

test("radiology steps do not say sample collected", () => {
  assert.equal(diagnosticStepLabel("sample_collected", "radiology"), "Scan completed");
  assert.equal(diagnosticStepLabel("processing", "radiology"), "Images under review");
  assert.equal(diagnosticStepLabel("sample_collected", "lab"), "Sample Collected");
});

test("an analyzer cable frame and a CSV export become the same result rows", () => {
  const csv = parseAnalyzerFeed("name,value,unit,reference,flag\nGlucose,96,mg/dL,70-110,normal");
  const cable = parseAnalyzerFeed("H|\\^&|||Analyzer\nR|1|^^^GLU^Glucose|96|mg/dL|70-110|N\nL|1|N");
  assert.equal(csv[0].name, "Glucose");
  assert.equal(cable[0].name, "Glucose");
  assert.equal(cable[0].value, "96");
  assert.equal(cable[0].unit, "mg/dL");
  assert.equal(cable[0].flag, "normal");
});

test("report rows keep a value per test and drop blanks", () => {
  const rows = normalizeReportResults([
    { name: "Hb", value: "11.2", unit: "g/dL", reference: "12-15", flag: "low" },
    { name: "", value: "9" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].flag, "low");
  assert.equal(newAccession({ kind: "lab" }, 1).startsWith("MH-LAB-"), true);
});
