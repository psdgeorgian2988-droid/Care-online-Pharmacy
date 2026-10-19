import assert from "node:assert/strict";
import test from "node:test";
import {
  digitalPrescriptionHtml,
  saveConfirmedDigitalRx,
} from "./digitalRxRecord.js";
import { loadMedicalRecords } from "./medicalRecord.js";

function memoryStore(seed = {}) {
  const mem = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
    },
    setItem(key, value) {
      mem[key] = String(value);
    },
    removeItem(key) {
      delete mem[key];
    },
  };
}

const parsedRx = {
  patientName: "Dharmendra Kumar",
  doctorName: "Dr. Shiv Chadha",
  date: "11/09/2026",
  medicinesConfirmed: true,
  sourceSavedAt: "2026-10-19T04:00:00.000Z",
  medicines: [
    {
      id: "med-1",
      name: "Prosigo",
      strength: "",
      timing: "HS",
      timesPerDay: "1 time a day",
      duration: "Not specified",
      userCorrected: true,
    },
    {
      id: "med-2",
      name: "More Fe",
      timing: "1-OD",
      timesPerDay: "1 time a day",
      duration: "15 days",
    },
    {
      id: "med-3",
      name: "Koglok-DS",
      timing: "1-1-1",
      timesPerDay: "3 times a day",
    },
  ],
  tests: [{ id: "test-1", name: "CBC" }],
};

test("digital Rx HTML names the brand, dose code and days", () => {
  const html = digitalPrescriptionHtml(parsedRx);
  assert.match(html, /Prosigo/);
  assert.match(html, />HS</);
  assert.match(html, /More Fe/);
  assert.match(html, />OD</);
  assert.match(html, /Koglok-DS/);
  assert.match(html, />TDS</);
  assert.match(html, /For how many days: 15 days/);
  assert.match(html, /CBC/);
  assert.equal(/Make correction/i.test(html), false);
});

test("does not save a digital Rx until medicines are confirmed", () => {
  const storage = memoryStore();
  const saved = saveConfirmedDigitalRx(
    { ...parsedRx, medicinesConfirmed: false },
    { savedAt: parsedRx.sourceSavedAt },
    {
      storage,
      profile: { name: "Test Customer", mobile: "9876543210" },
      people: [{ id: "self", name: "Test Customer", mobile: "9876543210" }],
    }
  );
  assert.equal(saved, null);
  assert.equal(loadMedicalRecords(storage).length, 0);
});

test("saves the confirmed digital Rx into the customer Prescription tab", () => {
  const storage = memoryStore();
  const saved = saveConfirmedDigitalRx(parsedRx, { savedAt: parsedRx.sourceSavedAt }, {
    storage,
    profile: { name: "Test Customer", mobile: "9876543210" },
    people: [{ id: "self", name: "Test Customer", mobile: "9876543210" }],
    today: "2026-09-11",
  });
  assert.equal(saved.kind, "prescription");
  assert.equal(saved.testName, "Digital Rx");
  assert.equal(saved.source, "digital-rx");
  assert.match(saved.fileType, /html/);
  assert.match(saved.digital.medicines.map((row) => row.name).join(" "), /Prosigo/);
  const rows = loadMedicalRecords(storage);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "prescription");
  assert.match(rows[0].fileData, /Prosigo/);

  const again = saveConfirmedDigitalRx(
    { ...parsedRx, accountRecordId: saved.id, medicines: [{ name: "Prosigo", timing: "HS" }] },
    { savedAt: parsedRx.sourceSavedAt },
    {
      storage,
      profile: { name: "Test Customer", mobile: "9876543210" },
      people: [{ id: "self", name: "Test Customer", mobile: "9876543210" }],
    }
  );
  assert.equal(again.id, saved.id);
  assert.equal(loadMedicalRecords(storage).length, 1);
});
