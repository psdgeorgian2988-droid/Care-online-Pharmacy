import assert from "node:assert/strict";
import test from "node:test";
import { buildDigitalPrescription, chartFrequency, foodTimingText } from "./digitalRxFormat.js";

test("digital prescription uses the MediHome table and leaves unwritten fields blank", () => {
  const doc = buildDigitalPrescription(
    {
      patientName: "Dharmendra Kumar",
      doctorName: "Dr. Shiv Chadha",
      date: "11/09/2026",
      sourceSavedAt: "2026-10-19T04:00:00.000Z",
      medicines: [
        { id: "med-1", name: "Prosigo", timing: "HS", form: "tablet", verified: true },
        {
          id: "med-2",
          name: "More Fe",
          timing: "1-0-0 after food",
          duration: "15 days",
          form: "tablet",
          verified: false,
        },
      ],
      tests: [{ name: "CBC" }],
    },
    { originalAttached: true, mobile: "9876543210" }
  );
  assert.equal(doc.title, "DIGITAL PRESCRIPTION");
  assert.match(doc.prescriptionId, /^MH-RX-2026-\d{5}$/);
  assert.equal(doc.status, "AI extracted – pending verification");
  assert.equal(doc.patient.name, "Dharmendra Kumar");
  assert.equal(doc.patient.mobile, "9876543210");
  assert.equal(doc.patient.ageGender, "");
  assert.equal(doc.doctor.qualification, "");
  assert.equal(doc.medicines[0].frequency, "HS");
  assert.equal(doc.medicines[0].dose, "1 tab");
  assert.equal(doc.medicines[1].frequency, "1-0-0");
  assert.equal(doc.medicines[1].foodTiming, "After food");
  assert.equal(doc.medicines[1].uncertain, true);
  assert.equal(doc.investigations[0].name, "CBC");
  assert.equal(doc.instructions.foodTiming, "After food");
  assert.equal(doc.verification.originalPrescription, "Attached");
  assert.equal(doc.verification.aiExtraction, "Completed");
  assert.equal(doc.verification.pharmacistVerification, "Pending");
  assert.match(doc.disclaimer, /not a substitute/i);
});

test("chart frequency prefers the written 1-0-1 grid", () => {
  assert.equal(chartFrequency({ timing: "1-0-1 after food" }), "1-0-1");
  assert.equal(foodTimingText({ timing: "1-0-0 before food" }), "Before food");
});
