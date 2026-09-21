import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeMedicineName,
  canonicalizePrescription,
  canonicalizeTestName,
} from "./rxCanonicalize.js";

test("corrects handwritten cefixime brand without swapping to another antibiotic", () => {
  const hit = canonicalizeMedicineName("Cefimax 200");
  assert.equal(hit.verified, true);
  assert.match(hit.name, /cefumax|cefixime/i);
  assert.equal(hit.salt, "Cefixime");
  const metformin = canonicalizeMedicineName("Cefimax 200");
  assert.notEqual(metformin.salt, "Metformin");
});

test("does not map a distinct name to metformin", () => {
  const hit = canonicalizeMedicineName("Cefumax");
  assert.equal(hit.salt, "Cefixime");
  const noise = canonicalizeMedicineName("xyzabc");
  assert.equal(noise.verified, false);
  assert.equal(noise.name, "xyzabc");
});

test("recognizes dolo, pantocid and ambrol", () => {
  assert.equal(canonicalizeMedicineName("Dolo 650").name, "Dolo");
  assert.equal(canonicalizeMedicineName("Pantocid").salt, "Pantoprazole");
  assert.equal(canonicalizeMedicineName("Syp Ambrol").salt, "Ambroxol");
});

test("splits CBC / CRP and keeps typhidot/dengue", () => {
  const tests = canonicalizePrescription({
    medicines: [],
    tests: [
      { name: "CBC / CRP" },
      { name: "Typhidot IgM" },
      { name: "Dengue Serology IgM" },
    ],
  }).tests.map((row) => row.name);
  assert.equal(tests.includes("Complete Blood Count (CBC)"), true);
  assert.equal(tests.includes("C-Reactive Protein (CRP)"), true);
  assert.equal(tests.includes("Typhidot IgM"), true);
  assert.equal(tests.includes("Dengue IgM Antibody"), true);
  assert.equal(tests.includes("Any Fluid-pH"), false);
});

test("recognizes transplant and diabetes OPD brands", () => {
  assert.equal(canonicalizeMedicineName("Wysolone 5").salt, "Prednisolone");
  assert.equal(canonicalizeMedicineName("Septran DS").salt, "Sulfamethoxazole + Trimethoprim");
  assert.equal(canonicalizeMedicineName("Lantus").salt, "Insulin glargine");
  assert.equal(canonicalizeMedicineName("Janumet 50/500").name, "Janumet");
  assert.equal(canonicalizeMedicineName("Amaryl 2 mg").name, "Amaryl");
  assert.equal(canonicalizeMedicineName("Famocid 40").salt, "Famotidine");
  assert.equal(
    canonicalizeMedicineName("Grafin", { instructions: "Tacrolimus; split dose" }).salt,
    "Tacrolimus"
  );
});

test("merges OCR lexicon hits that AI missed", () => {
  const merged = canonicalizePrescription(
    { medicines: [{ name: "Dolo 650", strength: "650 mg" }], tests: [] },
    { medicines: [{ name: "Tab Pantocid 40" }], tests: [{ name: "CBC" }] }
  );
  assert.equal(merged.medicines.some((row) => row.salt === "Paracetamol"), true);
  assert.equal(merged.medicines.some((row) => row.salt === "Pantoprazole"), true);
  assert.equal(merged.tests.some((row) => /CBC/i.test(row.name)), true);
});
