import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPartnerMedicineCorrection } from "./rxPartnerShare.js";

test("partner can correct a generated digital Rx medicine name", () => {
  const result = applyPartnerMedicineCorrection(
    {
      items: [{ id: "m1", name: "Lasetol" }],
      rxShare: {
        digital: {
          medicines: [{ id: "m1", name: "Lasetol", asWritten: "Lasetol" }],
        },
      },
    },
    { id: "m1", name: "Laretol" },
    { name: "Ravi Kumar" }
  );
  assert.equal(result.ok, true);
  assert.equal(result.patch.rxShare.digital.medicines[0].name, "Laretol");
  assert.equal(result.patch.rxShare.digital.medicines[0].partnerCorrected, true);
  assert.equal(result.patch.items[0].name, "Laretol");
});

test("rejects an empty partner name correction", () => {
  const result = applyPartnerMedicineCorrection(
    {
      rxShare: { digital: { medicines: [{ id: "m1", name: "Lasetol" }] } },
    },
    { id: "m1", name: "   " }
  );
  assert.equal(result.ok, false);
});
