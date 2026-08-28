import test from "node:test";
import assert from "node:assert/strict";
import {
  ADD_UNLISTED_TEST,
  LABORATORY_TESTS,
  correctTestSpelling,
  listedTestNames,
} from "./healthTestNames.js";

test("common misspellings map to the listed test name", () => {
  assert.equal(correctTestSpelling("livar function").name, "Liver Function Test (LFT)");
  assert.equal(correctTestSpelling("hba1c").name, "HbA1c - Diabetes Test");
  assert.equal(correctTestSpelling("cholestrol profile").name, "Lipid Profile");
  assert.equal(correctTestSpelling("ultasound abdomen").name, "Ultrasound Abdomen");
  assert.equal(correctTestSpelling("mamography").name, "Mammography");
});

test("unlisted tests keep a cleaned spelling", () => {
  const result = correctTestSpelling("vitamin b12");
  assert.equal(result.ok, true);
  assert.equal(result.name, "Vitamin B12 Test");
  const psa = correctTestSpelling("psa");
  assert.equal(psa.name, "Prostate Specific Antigen (PSA)");
});

test("novel names are title-cased and empty input is rejected", () => {
  const result = correctTestSpelling("allergy  panel");
  assert.equal(result.ok, true);
  assert.equal(result.name, "Allergy Panel");
  assert.equal(result.matchedExisting, false);
  const empty = correctTestSpelling("   ");
  assert.equal(empty.ok, false);
});

test("add-unlisted marker stays last and is not a real test name", () => {
  const names = listedTestNames(["Custom Panel"]);
  assert.equal(names.includes("Custom Panel"), true);
  assert.equal(names.at(-1), "Custom Panel");
  assert.equal(ADD_UNLISTED_TEST.startsWith("__"), true);
  assert.equal(LABORATORY_TESTS.includes(ADD_UNLISTED_TEST), false);
});
