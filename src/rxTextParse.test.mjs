import assert from "node:assert/strict";
import test from "node:test";
import { parseMedicineLine, parseRxText } from "./rxTextParse.js";

test("parses tablet chart, days and food", () => {
  const med = parseMedicineLine("1. Tab. Azithral 500mg 1-0-0 x 3 days after food");
  assert.equal(med.name.toLowerCase().includes("azithral"), true);
  assert.equal(med.strength.toLowerCase(), "500mg");
  assert.equal(med.form, "tablet");
  assert.equal(med.duration, "3 days");
  assert.equal(med.timesPerDay, "1 time a day");
  assert.match(med.timing, /1-0-0/);
});

test("parses BD syrup duration", () => {
  const med = parseMedicineLine("Syp. Zincovit 5ml BD x 7 days");
  assert.match(med.name, /zincovit/i);
  assert.equal(med.timesPerDay, "2 times a day");
  assert.equal(med.duration, "7 days");
  assert.equal(med.form, "syrup");
});

test("recovers noisy OCR medicine line", () => {
  const parsed = parseRxText("TRAE AZITHRAL S@@MG 1-a@-@ x 3 DAYE");
  assert.equal(parsed.medicines.length, 1);
  assert.match(parsed.medicines[0].name, /azithral/i);
  assert.equal(parsed.medicines[0].timesPerDay, "1 time a day");
  assert.equal(parsed.medicines[0].duration, "3 days");
});

test("extracts medicines and lab tests from a full Rx", () => {
  const parsed = parseRxText(`
    Dr Sharma
    Tab Pan 40 1-0-0 before food 5 days
    Cap Becosules OD x 10 days
    Adv: CBC, LFT, Vitamin D
  `);
  assert.equal(parsed.medicines.length >= 2, true);
  assert.equal(parsed.tests.some((row) => row.name === "CBC"), true);
  assert.equal(parsed.tests.some((row) => row.name === "LFT"), true);
  assert.equal(parsed.tests.some((row) => row.name === "Vitamin D"), true);
});
