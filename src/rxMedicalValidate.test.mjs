import assert from "node:assert/strict";
import test from "node:test";
import {
  medicallyValidatePrescription,
  pickSaferMedicine,
  restoreDroppedRxItems,
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

test("keeps the full AI medicine list when OCR only caught the first lines", () => {
  const result = medicallyValidatePrescription(
    {
      medicines: [
        { name: "Laretol", strength: "0.25 mcg" },
        { name: "Mednovit CD3" },
        { name: "Arkamin", strength: "0.1 mg" },
        { name: "Koglok DS" },
        { name: "More Fe" },
        { name: "Dapanox", strength: "10 mg" },
      ],
    },
    {
      medicines: [{ name: "Lasetol 0.25μgm" }, { name: "Mednovit CD3" }],
    }
  );
  const names = result.medicines.map((row) => row.name.toLowerCase()).join(" | ");
  assert.match(names, /laretol|lasetol|calcitriol/);
  assert.match(names, /mednovit/);
  assert.match(names, /arkamin/);
  assert.match(names, /koglok/);
  assert.match(names, /more fe/);
  assert.match(names, /dapanox/);
  assert.equal(result.medicines.length >= 6, true);
});

test("restoreDroppedRxItems puts back medicines a later pass omitted", () => {
  const restored = restoreDroppedRxItems(
    { medicines: [{ name: "Dolo", strength: "650 mg" }], tests: [{ name: "CBC" }] },
    {
      medicines: [
        { name: "Dolo", strength: "650 mg" },
        { name: "Pantocid", strength: "40 mg" },
      ],
      tests: [{ name: "CBC" }, { name: "LFT" }],
    }
  );
  assert.equal(restored.medicines.length, 2);
  assert.equal(restored.tests.some((row) => /LFT/i.test(row.name)), true);
});

test("extracts JSON from markdown fences for the medical AI reply", () => {
  const raw = extractJsonText('Sure.\n```json\n{"medicines":[{"name":"Dolo"}]}\n```\n');
  assert.equal(JSON.parse(raw).medicines[0].name, "Dolo");
});
