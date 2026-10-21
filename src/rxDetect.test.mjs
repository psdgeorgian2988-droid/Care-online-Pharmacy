import assert from "node:assert/strict";
import test from "node:test";
import { applyRxDetect, testServiceKind } from "./rxDetect.js";

const sample = {
  medicines: [{ id: "med-1", name: "Dolo 650" }],
  tests: [
    { id: "test-1", name: "CBC" },
    { id: "test-2", name: "Lipid profile" },
    { id: "test-3", name: "MRI Brain" },
    { id: "test-4", name: "X-Ray Chest" },
  ],
  warning: "",
};

test("catalog names split laboratory tests from radiology studies", () => {
  assert.equal(testServiceKind("CBC"), "lab");
  assert.equal(testServiceKind("Lipid profile"), "lab");
  assert.equal(testServiceKind("MRI Brain"), "radiology");
  assert.equal(testServiceKind("X-Ray Chest"), "radiology");
  assert.equal(testServiceKind("Ultrasound abdomen"), "radiology");
});

test("medicine uploads keep medicines and drop tests", () => {
  const next = applyRxDetect(sample, "medicine");
  assert.deepEqual(
    next.medicines.map((row) => row.name),
    ["Dolo 650"]
  );
  assert.equal(next.tests.length, 0);
  assert.equal(next.detect, "medicine");
});

test("lab uploads keep laboratory tests only", () => {
  const next = applyRxDetect(sample, "lab");
  assert.equal(next.medicines.length, 0);
  assert.deepEqual(
    next.tests.map((row) => row.name),
    ["CBC", "Lipid profile"]
  );
  assert.equal(next.detect, "lab");
});

test("radiology uploads keep imaging studies only", () => {
  const next = applyRxDetect(sample, "radiology");
  assert.equal(next.medicines.length, 0);
  assert.deepEqual(
    next.tests.map((row) => row.name),
    ["MRI Brain", "X-Ray Chest"]
  );
  assert.equal(next.detect, "radiology");
});

test("step-down uploads keep medicines and every test", () => {
  const next = applyRxDetect(sample, "stepdown");
  assert.equal(next.medicines.length, 1);
  assert.equal(next.tests.length, 4);
  assert.equal(next.detect, "stepdown");
});

test("vaccination uploads keep medicines and every test", () => {
  const next = applyRxDetect(sample, "vaccination");
  assert.equal(next.medicines.length, 1);
  assert.equal(next.tests.length, 4);
  assert.equal(next.detect, "vaccination");
});

test("an empty focus keeps the full prescription", () => {
  const next = applyRxDetect(sample, "");
  assert.equal(next.medicines.length, 1);
  assert.equal(next.tests.length, 4);
});
