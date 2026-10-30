import assert from "node:assert/strict";
import test from "node:test";
import {
  DOCTOR_EXPERIENCE,
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALTIES,
  doctorProfileMissing,
  experienceLabel,
  specialtyLabel,
} from "./doctorCredentials.js";

const ready = {
  role: "Doctor",
  profile: {
    specialty: "cardiologist",
    qualification: "MBBS, MD",
    experienceYears: "12",
    registrationNumber: "DMC-12345",
    registrationCouncil: "Delhi Medical Council",
    email: "doctor@medihome.co.in",
    aadhaarNumber: "123456789012",
    photoData: "data:image/jpeg;base64,YQ==",
    aadhaarFileData: "data:application/pdf;base64,YQ==",
    policeFileData: "data:application/pdf;base64,YQ==",
    certificates: [{ name: "MD.pdf", fileData: "data:application/pdf;base64,YQ==" }],
  },
};

test("doctor choices cover specialty, qualification, and experience", () => {
  assert.ok(DOCTOR_SPECIALTIES.length >= 30);
  assert.ok(DOCTOR_QUALIFICATIONS.includes("MBBS"));
  assert.ok(DOCTOR_QUALIFICATIONS.includes("DM"));
  assert.equal(DOCTOR_EXPERIENCE[0].label, "Less than 1 year");
  assert.equal(DOCTOR_EXPERIENCE.at(-1).label, "40+ years");
  assert.equal(specialtyLabel("cardiologist"), "Cardiologist");
  assert.equal(experienceLabel("12"), "12 years");
});

test("a doctor profile is saved only when every field and upload is present", () => {
  assert.equal(doctorProfileMissing(ready), "");
  assert.match(doctorProfileMissing({ ...ready, profile: { ...ready.profile, specialty: "" } }), /specialty/);
  assert.match(doctorProfileMissing({ ...ready, profile: { ...ready.profile, photoData: "" } }), /photo/);
  assert.match(
    doctorProfileMissing({ ...ready, profile: { ...ready.profile, certificates: [] } }),
    /certificate/
  );
});
