import assert from "node:assert/strict";
import test from "node:test";
import {
  DOCTOR_SYMPTOMS,
  doctorKnowsMobile,
  doctorPrescriptionFrom,
  doctorVisitSummary,
  visitsForPatient,
} from "./doctorVisit.js";

test("an appointment summary shows the booking the customer sent", () => {
  const summary = doctorVisitSummary({
    patientName: "Anita",
    mobile: "9876543210",
    address: "12 Park Street, Delhi",
    pinCode: "110001",
    date: "2026-11-02",
    timeSlot: "5:00 PM",
    concern: "Fever and running nose",
  });
  assert.equal(summary.name, "Anita");
  assert.equal(summary.mobile, "9876543210");
  assert.match(summary.address, /Park Street/);
  assert.match(summary.address, /110001/);
  assert.equal(summary.time, "2026-11-02 · 5:00 PM");
  assert.equal(summary.reason, "Fever and running nose");
  assert.ok(DOCTOR_SYMPTOMS.includes("Fever"));
  assert.ok(DOCTOR_SYMPTOMS.includes("Running nose"));
});

test("a prescription keeps added symptoms and groups later visits by mobile", () => {
  const saved = doctorPrescriptionFrom({
    symptoms: ["Fever", " fever ", "Running nose", "X"],
    note: "Rest and fluids",
  });
  assert.equal(saved.ok, true);
  assert.deepEqual(saved.prescription.symptoms, ["Fever", "Running nose"]);
  assert.equal(doctorPrescriptionFrom({ symptoms: [] }).ok, false);
  const current = { mobile: "9876543210", date: "2026-11-02", doctorPrescription: saved.prescription };
  const older = { mobile: "9876543210", date: "2026-10-01", concern: "Cough" };
  const other = { mobile: "9000000000", date: "2026-11-02" };
  assert.deepEqual(
    visitsForPatient([other, current, older], current).map((row) => row.date),
    ["2026-11-02", "2026-10-01"]
  );
  assert.equal(doctorKnowsMobile([current], "9876543210"), true);
  assert.equal(doctorKnowsMobile([current], "9000000001"), false);
});
