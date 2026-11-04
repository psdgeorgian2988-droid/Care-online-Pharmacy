import assert from "node:assert/strict";
import test from "node:test";
import { parseAnalyzerCsv, tubeForTest } from "./labAccession.js";
import { canCustomerChangeLabBooking } from "./labCustomerActions.js";
import { mergeAddedLabTests } from "./labTestSplit.js";
import { collectorCapacity, slotRemaining } from "./labSlots.js";
import { sampleCollectedFields } from "./labPipeline.js";

test("a slot closes when collector capacity is used", () => {
  const orders = [
    { id: "A", kind: "lab", preferredLabId: "metropolis", date: "2026-11-04", timeSlot: "7:00 AM - 9:00 AM", trackStatus: "confirmed" },
  ];
  assert.equal(slotRemaining(orders, { labId: "metropolis", date: "2026-11-04", slot: "7:00 AM - 9:00 AM", kind: "lab", capacity: 1 }), 0);
  assert.equal(slotRemaining(orders, { labId: "metropolis", date: "2026-11-04", slot: "7:00 AM - 9:00 AM", kind: "lab", capacity: 1, excludeId: "A" }), 1);
  assert.equal(collectorCapacity([], "metropolis"), 3);
});

test("customer can change a lab booking only before the sample is taken", () => {
  assert.equal(canCustomerChangeLabBooking({ kind: "lab", trackStatus: "confirmed" }), true);
  assert.equal(canCustomerChangeLabBooking({ kind: "lab", trackStatus: "sample_collected" }), false);
  assert.equal(canCustomerChangeLabBooking({ kind: "medicine", trackStatus: "confirmed" }), false);
});

test("sample tubes and analyzer CSV stay with the accession", () => {
  assert.equal(tubeForTest("Complete Urine Examination"), "Urine");
  assert.equal(tubeForTest("Complete Blood Count (CBC)"), "EDTA");
  const fields = sampleCollectedFields({ kind: "lab", tests: [{ name: "CBC" }, { name: "Urine Routine" }] }, 1_700_000_000_000);
  assert.equal(fields.samples.length, 2);
  assert.match(fields.samples[0].barcode, /MH-LAB-/);
  const rows = parseAnalyzerCsv("name,value,unit,reference,flag\nHb,12,g/dL,12-16,normal");
  assert.equal(rows[0].value, "12");
  assert.equal(rows[0].flag, "normal");
});

test("a lab can set its own price and hide a shared test", () => {
  const labs = [{ id: "metropolis", tests: [{ id: "cbc", name: "CBC", price: 499 }] }];
  const priced = mergeAddedLabTests(labs, [
    { id: "LT-9", labId: "metropolis", code: "cbc", name: "CBC", price: 550, override: true, partnerPercent: 80 },
  ]);
  assert.equal(priced[0].tests[0].price, 550);
  const hidden = mergeAddedLabTests(labs, [
    { id: "LT-9", labId: "metropolis", code: "cbc", name: "CBC", price: 550, override: true, hidden: true },
  ]);
  assert.equal(hidden[0].tests.length, 0);
});
