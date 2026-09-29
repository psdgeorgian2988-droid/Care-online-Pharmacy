import test from "node:test";
import assert from "node:assert/strict";
import {
  HOLDER_REPORT_ID,
  householdReportPeople,
  isHiddenMedicalRecordSource,
  medicalRecordPeople,
  partnerCompletedPatients,
  partnerCompletedReports,
  partnerPatientRecords,
  patientIdentityFromSource,
  personLabel,
  reportBelongsTo,
  uniquePartnerPatients,
} from "./reportPeople.js";

test("household list is account holder then family members", () => {
  const people = householdReportPeople({
    name: "Anita Sharma",
    mobile: "9876543210",
    familyMembers: [
      { id: "fam-1", name: "Aarav Sharma", relation: "son" },
      { id: "fam-2", name: "Neha Sharma", relation: "spouse" },
    ],
  });
  assert.equal(people[0].id, HOLDER_REPORT_ID);
  assert.equal(people[0].name, "Anita Sharma");
  assert.equal(people[1].name, "Aarav Sharma");
  assert.equal(people[2].name, "Neha Sharma");
  assert.match(personLabel(people[1]), /Son/);
});

test("a logged-in family member only sees their own name", () => {
  const people = householdReportPeople(
    {
      name: "Anita Sharma",
      familyMembers: [
        { id: "fam-1", name: "Aarav Sharma", relation: "son" },
        { id: "fam-2", name: "Neha Sharma", relation: "spouse" },
      ],
    },
    { accountRole: "member", accountMemberId: "fam-1", name: "Aarav Sharma" }
  );
  assert.equal(people.length, 1);
  assert.equal(people[0].id, "fam-1");
});

test("saved reports filter by the selected member", () => {
  const aarav = { id: "r1", memberId: "fam-1", testName: "CBC" };
  const anita = { id: "r2", memberId: "self", testName: "LFT" };
  const legacy = { id: "r3", testName: "X-Ray Chest" };
  assert.equal(reportBelongsTo(aarav, "fam-1"), true);
  assert.equal(reportBelongsTo(anita, "fam-1"), false);
  assert.equal(reportBelongsTo(legacy, "self"), true);
  assert.equal(reportBelongsTo(legacy, "fam-1"), false);
  assert.equal(reportBelongsTo(aarav, ""), true);
  assert.equal(reportBelongsTo(anita, ""), true);
});

test("household people include the account holder mobile", () => {
  const people = householdReportPeople({
    name: "Anita Sharma",
    mobile: "9876543210",
    familyMembers: [{ id: "fam-1", name: "Aarav Sharma", relation: "son" }],
  });
  assert.equal(people[0].mobile, "9876543210");
  assert.equal(people[1].mobile, "9876543210");
});

test("order patient identity uses bookedFor, then name and mobile", () => {
  const people = householdReportPeople({
    name: "Anita Sharma",
    mobile: "9876543210",
    familyMembers: [{ id: "fam-1", name: "Aarav Sharma", relation: "son" }],
  });
  assert.equal(
    patientIdentityFromSource({ bookedFor: "fam-1", patientName: "Aarav Sharma" }, people)
      .patientId,
    "fam-1"
  );
  assert.equal(
    patientIdentityFromSource(
      { patientName: "Aarav Sharma", mobile: "9876543210" },
      people
    ).patientId,
    "fam-1"
  );
  assert.equal(
    patientIdentityFromSource({ bookedFor: "self", patientName: "Anita Sharma" }, people)
      .patientId,
    HOLDER_REPORT_ID
  );
  const other = patientIdentityFromSource({
    bookedFor: "other",
    patientName: "Guest Patient",
    mobile: "9988776655",
  });
  assert.equal(other.patientId, "other:guest-patient:9988776655");
  assert.equal(other.patientName, "Guest Patient");
});

test("mis-tagged self reports still match the named family member", () => {
  const people = householdReportPeople({
    name: "Anita Sharma",
    mobile: "9876543210",
    familyMembers: [{ id: "fam-1", name: "Aarav Sharma", relation: "son" }],
  });
  const taggedSelf = {
    memberId: "self",
    memberName: "Aarav Sharma",
    patientName: "Aarav Sharma",
  };
  assert.equal(reportBelongsTo(taggedSelf, "fam-1", people), true);
  assert.equal(reportBelongsTo(taggedSelf, "self", people), false);
});

test("partner jobs group uploaded reports by the same patient", () => {
  const jobs = [
    {
      id: "MH-LAB-1",
      bookedFor: "fam-1",
      patientName: "Aarav Sharma",
      mobile: "9876543210",
      reportFileName: "cbc.pdf",
      reportTestName: "CBC",
      reportFileData: "data:application/pdf;base64,aaa",
    },
    {
      id: "MH-LAB-2",
      bookedFor: "fam-1",
      patientName: "Aarav Sharma",
      mobile: "9876543210",
      reportFileName: "lipid.pdf",
      reportTestName: "Lipid Profile",
      reportFileData: "data:application/pdf;base64,bbb",
    },
    {
      id: "MH-LAB-3",
      bookedFor: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
      reportFileName: "lft.pdf",
      reportTestName: "Liver Function Test (LFT)",
      reportFileData: "data:application/pdf;base64,ccc",
    },
    {
      id: "MH-LAB-4",
      bookedFor: "fam-1",
      patientName: "Aarav Sharma",
      mobile: "9876543210",
    },
  ];
  const aaravFiles = partnerPatientRecords(jobs, jobs[0]);
  assert.deepEqual(
    aaravFiles.map((row) => row.orderId),
    ["MH-LAB-1", "MH-LAB-2"]
  );
  const anitaFiles = partnerPatientRecords(jobs, jobs[2]);
  assert.deepEqual(
    anitaFiles.map((row) => row.orderId),
    ["MH-LAB-3"]
  );
  assert.equal(aaravFiles[0].patientName, "Aarav Sharma");
  assert.equal(aaravFiles[0].mobile, "9876543210");
  assert.equal(aaravFiles[0].testName, "CBC");
  const completed = partnerCompletedReports(jobs);
  assert.deepEqual(
    completed.map((row) => row.orderId),
    ["MH-LAB-1", "MH-LAB-2", "MH-LAB-3"]
  );
  const patients = uniquePartnerPatients(jobs);
  assert.deepEqual(
    patients.map((row) => row.patientId),
    ["fam-1", "self"]
  );
  const completedPatients = partnerCompletedPatients(jobs);
  assert.deepEqual(
    completedPatients.map((row) => row.patientId),
    ["fam-1", "self"]
  );
  assert.deepEqual(
    completedPatients[0].files.map((row) => row.orderId),
    ["MH-LAB-1", "MH-LAB-2"]
  );
  assert.deepEqual(
    completedPatients[1].files.map((row) => row.orderId),
    ["MH-LAB-3"]
  );
});

test("patient list built from one tab does not add other-kind-only people", () => {
  const household = [{ id: "self", name: "Anita Sharma", mobile: "9876543210" }];
  const labOnly = [
    {
      id: "lab-1",
      kind: "lab",
      patientId: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
    },
  ];
  const mixed = [
    ...labOnly,
    {
      id: "img-1",
      kind: "radiology",
      patientId: "other:bob",
      patientName: "Bob",
    },
  ];
  const fromLab = medicalRecordPeople(household, labOnly);
  const fromMixed = medicalRecordPeople(household, mixed);
  assert.equal(fromLab.some((row) => row.id === "other:bob"), false);
  assert.equal(fromMixed.some((row) => row.id === "other:bob"), true);
  assert.equal(fromLab.some((row) => row.id === "self"), true);
});

test("COD Collect Verify stays off the medical record patient list", () => {
  assert.equal(isHiddenMedicalRecordSource({ patientName: "COD Collect Verify" }), true);
  assert.equal(isHiddenMedicalRecordSource({ id: "MH-LAB-VERIFY-1" }), true);
  const people = medicalRecordPeople(
    [{ id: "self", name: "Priya Sharma" }],
    [
      { id: "r1", patientName: "COD Collect Verify", testName: "CBC" },
      { id: "r2", memberId: "self", patientName: "Priya Sharma", testName: "CBC" },
    ]
  );
  assert.equal(people.some((row) => /collect verify/i.test(row.name)), false);
  assert.equal(people.some((row) => row.name === "Priya Sharma"), true);
});
