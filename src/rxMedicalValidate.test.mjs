import assert from "node:assert/strict";
import test from "node:test";
import {
  medicallyValidatePrescription,
  pickSaferMedicine,
} from "./rxMedicalValidate.js";
import { extractJsonText } from "../server/prescriptionCursor.mjs";

test("keeps verified OCR cefixime instead of an AI metformin guess", () => {
  const picked = pickSaferMedicine(
    { name: "Metformin", strength: "500 mg" },
    { name: "Cefumax", strength: "200 mg" }
  );
  assert.equal(picked.salt, "Cefixime");
  assert.match(picked.name, /cefumax|cefixime/i);
});

test("medical validation merges OCR tests and drops the wrong AI salt", () => {
  const result = medicallyValidatePrescription(
    {
      medicines: [{ name: "Metformin", strength: "500 mg" }],
      tests: [{ name: "CBC / CRP" }],
    },
    {
      medicines: [{ name: "Tab Cefumax 200", strength: "200 mg" }],
      tests: [{ name: "Typhidot IgM" }],
    }
  );
  assert.equal(result.medicines.some((row) => row.salt === "Cefixime"), true);
  assert.equal(result.medicines.some((row) => row.salt === "Metformin"), false);
  assert.equal(result.tests.some((row) => /CBC/i.test(row.name)), true);
  assert.equal(result.tests.some((row) => /CRP/i.test(row.name)), true);
  assert.equal(result.tests.some((row) => /Typhidot/i.test(row.name)), true);
});

test("extracts JSON from markdown fences for the medical AI reply", () => {
  const raw = extractJsonText('Sure.\n```json\n{"medicines":[{"name":"Dolo"}]}\n```\n');
  assert.equal(JSON.parse(raw).medicines[0].name, "Dolo");
});
