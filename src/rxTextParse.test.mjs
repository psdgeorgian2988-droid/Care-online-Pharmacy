import assert from "node:assert/strict";
import test from "node:test";
import { parseMedicineLine, parseRxText, rxDoseCode } from "./rxTextParse.js";

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

test("strips Tab. prefix so Dolo and Pantocid canonicalize", () => {
  const dolo = parseMedicineLine("Tab. Dolo 650 1-0-1 x 5 days");
  assert.match(dolo.name, /^dolo/i);
  const panto = parseMedicineLine("Tab. Pantocid 40 1-0-0 before food 5 days");
  assert.match(panto.name, /pantocid/i);
});

test("does not treat the patient header as a medicine", () => {
  const parsed = parseRxText(`
    Patient: Test Customer  Date: 19/10/2026
    1. Tab. Azithral 500mg 1-0-0 x 3 days after food
  `);
  assert.equal(parsed.medicines.length, 1);
  assert.match(parsed.medicines[0].name, /azithral/i);
  assert.equal(/patient/i.test(parsed.medicines[0].name), false);
});

test("reads a medicine line with strength even without Tab prefix", () => {
  const med = parseMedicineLine("Azithral 500mg");
  assert.match(med.name, /azithral/i);
  assert.equal(med.strength.toLowerCase(), "500mg");
});

test("joins a split OCR name and dose onto one medicine", () => {
  const parsed = parseRxText("Dolo 650\n1-0-1 x 5 days after food");
  assert.equal(parsed.medicines.length, 1);
  assert.match(parsed.medicines[0].name, /dolo/i);
  assert.equal(parsed.medicines[0].timesPerDay, "2 times a day");
  assert.equal(parsed.medicines[0].duration, "5 days");
});

test("reads T. nephrology OPD lines with microgram strength and OD charting", () => {
  const parsed = parseRxText(`
    T. Lasetol 0.25μgm 1—OD
    Cap. Mednovit CD3 1—OD
    T. Arkamin 0.1mg 1-1
    Cap. Prosigo (HS) 1—OD
    T. Koglok DS 1-1-1
    Cap. More Fe 1—OD
    T. Sobisis EC Forte 1-1
    T. Dapanox 10mg 1-OD
    Adv: CBC ESR, RFT, iPTH, Urine R/M, Urine PC ratio
  `);
  const names = parsed.medicines.map((row) => row.name.toLowerCase()).join(" | ");
  assert.match(names, /lasetol|laretol|calcitriol/);
  assert.match(names, /mednovit/);
  assert.match(names, /arkamin/);
  assert.match(names, /prosigo/);
  assert.equal(/prograf|tacrolimus/i.test(names), false);
  assert.match(names, /koglok/);
  assert.match(names, /more fe/);
  assert.match(names, /sobisis|sobosis/);
  assert.match(names, /dapanox/);
  const lasetol = parsed.medicines.find((row) => /lasetol|laretol|calcitriol/i.test(row.name));
  assert.match(String(lasetol.strength), /0\.25/);
  assert.equal(lasetol.timesPerDay, "1 time a day");
  const arkamin = parsed.medicines.find((row) => /arkamin/i.test(row.name));
  assert.equal(arkamin.timesPerDay, "2 times a day");
  const koglok = parsed.medicines.find((row) => /koglok/i.test(row.name));
  assert.equal(koglok.timesPerDay, "3 times a day");
  const tests = parsed.tests.map((row) => row.name.toLowerCase()).join(" | ");
  assert.match(tests, /cbc/);
  assert.match(tests, /esr/);
  assert.match(tests, /rft|kft/);
  assert.match(tests, /ipth|pth/);
  assert.match(tests, /urine/);
});

test("reads jammed Adv OCR such as 2Cct and PTY as tests", () => {
  const parsed = parseRxText("Adv\nCRCesp\nRFT\nPTY\nULiue\nUrine PC ratio");
  const tests = parsed.tests.map((row) => row.name.toLowerCase()).join(" | ");
  assert.match(tests, /cbc/);
  assert.match(tests, /esr/);
  assert.match(tests, /rft|kft/);
  assert.match(tests, /pth/);
  assert.match(tests, /urine/);
});

test("recovers noisy OCR fragments from a handwritten nephrology Rx", () => {
  const parsed = parseRxText(`
    Cap Meduoy Jeo 1-OD
    Cap Moy Fe 1-OD
    T Seber EC forte 1-1
    Progiag HS 1-OD
    T leoplok DS 1-1-1
  `);
  const names = parsed.medicines.map((row) => row.name.toLowerCase()).join(" | ");
  assert.match(names, /mednovit/);
  assert.match(names, /more fe/);
  assert.match(names, /sobisis/);
  assert.match(names, /prosigo/);
  assert.equal(/prograf|tacrolimus/i.test(names), false);
  assert.match(names, /koglok/);
});

test("maps OD, BD, TDS, HS and SOS as inline dose codes", () => {
  assert.equal(rxDoseCode(parseMedicineLine("Tab Azithral 500mg 1-0-0 x 3 days")), "OD");
  assert.equal(rxDoseCode(parseMedicineLine("Syp. Zincovit 5ml BD x 7 days")), "BD");
  assert.equal(rxDoseCode(parseMedicineLine("T. Koglok DS 1-1-1")), "TDS");
  assert.equal(rxDoseCode(parseMedicineLine("Cap. Prosigo (HS) 1-OD")), "HS");
  assert.equal(rxDoseCode({ timesPerDay: "As needed" }), "SOS");
  assert.equal(parseMedicineLine("Syp. Zincovit 5ml BD x 7 days").doseCode, "BD");
});
