import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MEDICAL_RECORD_TABS,
  MEDICAL_RECORD_VIEWER_ACTIONS,
  buildCustomerMedicalRecord,
  collectMedicalRecords,
  downloadMedicalRecordFile,
  inferDiagnosticKind,
  medicalRecordActiveKind,
  medicalRecordFileCard,
  medicalRecordForViewer,
  medicalRecordHasFile,
  medicalRecordIsKindPage,
  medicalRecordKindHref,
  medicalRecordObjectUrl,
  medicalRecordKind,
  medicalRecordListCard,
  medicalRecordListTitle,
  medicalRecordPatientCard,
  medicalRecordStoredFileName,
  medicalRecordTabKind,
  medicalRecordTabLabel,
  patientsForActiveTab,
  visibleMedicalRecordTabs,
  printMedicalRecordFile,
  recordsForActiveTab,
  recordsForPatient,
  recordsInSection,
  uniquePatientsFromRecords,
  vaccinationCertificateHtml,
  vaccinationDoseAsMedicalRecord,
  validateMedicalUploadDetails,
  validateMedicalUploadFile,
} from "./medicalRecord.js";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("lab vs imaging uses kind on stored records", () => {
  assert.equal(medicalRecordKind({ kind: "lab", testName: "MRI Brain" }), "lab");
  assert.equal(medicalRecordKind({ kind: "vaccination", testName: "BCG" }), "vaccination");
  assert.equal(
    medicalRecordKind({ kind: "radiology", testName: "Complete Blood Count (CBC)" }),
    "radiology"
  );
  assert.equal(medicalRecordKind({ kind: "prescription", name: "Rx" }), "prescription");
  assert.equal(medicalRecordKind({ kind: "imaging", testName: "CT Head" }), "radiology");
});

test("records without kind fall back to the test name", () => {
  assert.equal(inferDiagnosticKind("Complete Blood Count (CBC)"), "lab");
  assert.equal(inferDiagnosticKind("X-Ray Chest"), "radiology");
  assert.equal(medicalRecordKind({ testName: "Ultrasound Abdomen" }), "radiology");
  assert.equal(medicalRecordKind({ testName: "Lipid Profile" }), "lab");
  assert.equal(medicalRecordKind({ testName: "CT Head follow-up" }), "radiology");
  assert.equal(medicalRecordKind({ testName: "BCG" }), "vaccination");
});

test("medical record page tabs are lab, imaging, prescription, and vaccination", () => {
  assert.deepEqual(
    MEDICAL_RECORD_TABS.map((tab) => tab.id),
    ["lab", "radiology", "prescription", "vaccination"]
  );
  assert.deepEqual(
    MEDICAL_RECORD_TABS.map((tab) => tab.label),
    ["Lab report", "Imaging report", "Prescription", "Vaccination"]
  );
  assert.equal(medicalRecordTabKind("lab"), "lab");
  assert.equal(medicalRecordTabKind("imaging"), "radiology");
  assert.equal(medicalRecordTabKind("prescription"), "prescription");
  assert.equal(medicalRecordTabKind("vaccination"), "vaccination");
  assert.equal(medicalRecordTabKind("all"), "");
  assert.equal(medicalRecordTabKind("reports"), "");
  assert.equal(medicalRecordActiveKind("all"), "lab");
  assert.equal(medicalRecordActiveKind(""), "lab");
  assert.equal(medicalRecordActiveKind("imaging"), "radiology");
  assert.equal(medicalRecordTabLabel("all"), "Lab report");
  assert.equal(medicalRecordTabLabel("radiology"), "Imaging report");
});

test("clicked kind page hides sibling Medical Record tabs", () => {
  assert.equal(medicalRecordIsKindPage("lab"), true);
  assert.equal(medicalRecordIsKindPage("imaging"), true);
  assert.equal(medicalRecordIsKindPage("prescription"), true);
  assert.equal(medicalRecordIsKindPage("vaccination"), true);
  assert.equal(medicalRecordIsKindPage(""), false);
  assert.equal(medicalRecordIsKindPage("all"), false);
  assert.deepEqual(visibleMedicalRecordTabs("lab"), []);
  assert.deepEqual(visibleMedicalRecordTabs("radiology"), []);
  assert.deepEqual(visibleMedicalRecordTabs("imaging"), []);
  assert.deepEqual(visibleMedicalRecordTabs("prescription"), []);
  assert.deepEqual(visibleMedicalRecordTabs("vaccination"), []);
  assert.deepEqual(
    visibleMedicalRecordTabs("").map((tab) => tab.id),
    ["lab", "radiology", "prescription", "vaccination"]
  );
  assert.equal(medicalRecordKindHref("lab"), "#reports?service=lab");
  assert.equal(medicalRecordKindHref("imaging"), "#reports?service=radiology");
  assert.equal(medicalRecordKindHref("prescription"), "#reports?service=prescription");
  assert.equal(medicalRecordKindHref("vaccination"), "#reports?service=vaccination");
  assert.equal(medicalRecordKindHref("lab", "self"), "#reports?service=lab&id=self");
});

test("Reports opens a clicked kind without a sibling tab strip", () => {
  const source = readFileSync(new URL("./Reports.jsx", import.meta.url), "utf8");
  assert.match(source, /visibleMedicalRecordTabs/);
  assert.match(source, /medicalRecordIsKindPage/);
  assert.match(source, /landingTabs\.map/);
  assert.doesNotMatch(source, /role="tablist"/);
  assert.doesNotMatch(source, /All reports/);
});

test("upload details validate before a file is asked", () => {
  assert.deepEqual(
    validateMedicalUploadDetails("prescription", { date: "2026-09-27" }),
    {}
  );
  assert.equal(
    validateMedicalUploadDetails("prescription", { clinicName: "Dr Sharma" }).date,
    "Please select a date."
  );
  assert.ok(
    validateMedicalUploadDetails("lab", { date: "2026-09-27" }).testName
  );
  assert.deepEqual(
    validateMedicalUploadDetails("lab", {
      date: "2026-09-27",
      testName: "CBC",
    }),
    {}
  );
  assert.deepEqual(
    validateMedicalUploadDetails("radiology", {
      date: "2026-09-27",
      testName: "X-Ray Chest",
    }),
    {}
  );
  assert.equal(
    validateMedicalUploadDetails("vaccination", { date: "2026-09-27" }).testName,
    "Please select a vaccine name."
  );
  assert.deepEqual(
    validateMedicalUploadDetails("vaccination", {
      date: "2026-09-27",
      testName: "BCG",
    }),
    {}
  );
  assert.ok(validateMedicalUploadFile({}).file);
  assert.deepEqual(validateMedicalUploadFile({ fileName: "rx.jpg" }), {});
});

test("upload inside a tab is stored under that heading", () => {
  const rx = buildCustomerMedicalRecord(
    "prescription",
    {
      date: "2026-09-27",
      clinicName: "Dr Sharma Clinic",
      notes: "Follow-up",
      fileName: "rx.pdf",
    },
    { id: "rx-new" }
  );
  const lab = buildCustomerMedicalRecord(
    "lab",
    {
      testName: "CBC",
      date: "2026-09-27",
      clinicName: "City Path Lab",
      fileName: "cbc.pdf",
    },
    { id: "lab-new" }
  );
  const imaging = buildCustomerMedicalRecord(
    "radiology",
    {
      testName: "X-Ray Chest",
      date: "2026-09-26",
      fileName: "xray.pdf",
    },
    { id: "img-new" }
  );
  const vax = buildCustomerMedicalRecord(
    "vaccination",
    {
      testName: "BCG",
      date: "2026-09-20",
      fileName: "bcg.pdf",
    },
    { id: "vax-new" }
  );
  const rows = [rx, lab, imaging, vax];
  assert.equal(rx.kind, "prescription");
  assert.equal(lab.kind, "lab");
  assert.equal(imaging.kind, "radiology");
  assert.equal(vax.kind, "vaccination");
  assert.deepEqual(
    recordsInSection(rows, "prescription").map((row) => row.id),
    ["rx-new"]
  );
  assert.deepEqual(
    recordsInSection(rows, "lab").map((row) => row.id),
    ["lab-new"]
  );
  assert.deepEqual(
    recordsInSection(rows, "radiology").map((row) => row.id),
    ["img-new"]
  );
  assert.deepEqual(
    recordsInSection(rows, "vaccination").map((row) => row.id),
    ["vax-new"]
  );
});

test("generated lab and imaging cards show only patient name and mobile", () => {
  const lab = {
    kind: "lab",
    testName: "CBC",
    patientName: "Aarav Sharma",
    mobile: "9876543210",
    date: "2026-09-27",
    notes: "Fasting",
    name: "City Path Lab",
    fileName: "scan.pdf",
  };
  assert.deepEqual(medicalRecordListCard(lab), {
    kind: "lab",
    primary: "Aarav Sharma",
    secondary: "9876543210",
  });
  assert.deepEqual(
    medicalRecordListCard({
      kind: "radiology",
      testName: "X-Ray Chest",
      patientName: "Anita Sharma",
      mobile: "9876543210",
    }),
    {
      kind: "radiology",
      primary: "Anita Sharma",
      secondary: "9876543210",
    }
  );
  assert.deepEqual(
    medicalRecordListCard({
      kind: "prescription",
      name: "Dr Sharma Clinic",
      testName: "Prescription",
      date: "2026-09-27",
      patientName: "Anita Sharma",
      mobile: "9876543210",
    }),
    {
      kind: "prescription",
      primary: "Prescription",
      secondary: "2026-09-27",
    }
  );
});

test("stored and saved report files use the test name, not a generic report.pdf", () => {
  assert.equal(
    medicalRecordStoredFileName({
      testName: "CBC",
      fileName: "report.pdf",
      fileType: "application/pdf",
    }),
    "CBC.pdf"
  );
  assert.equal(
    medicalRecordStoredFileName({
      testName: "HbA1c - Diabetes Test",
      fileName: "scan.jpg",
      fileType: "image/jpeg",
    }),
    "HbA1c - Diabetes Test.jpg"
  );
  assert.equal(
    medicalRecordStoredFileName({
      testName: "X-Ray Chest",
      fileName: "img",
      fileType: "image/png",
    }),
    "X-Ray Chest.png"
  );
  const saved = buildCustomerMedicalRecord(
    "lab",
    {
      testName: "CBC",
      date: "2026-09-27",
      fileName: "report.pdf",
      fileType: "application/pdf",
    },
    { id: "lab-named", person: { id: "fam-1", name: "Aarav Sharma", mobile: "9876543210" } }
  );
  assert.equal(saved.fileName, "CBC.pdf");
  assert.equal(medicalRecordListCard(saved).primary, "Aarav Sharma");
  assert.equal(medicalRecordListCard(saved).secondary, "9876543210");
  assert.equal(medicalRecordForViewer(saved).fileName, "CBC.pdf");
});

test("opened report viewer actions are save and print", () => {
  assert.deepEqual(MEDICAL_RECORD_VIEWER_ACTIONS, ["Save", "Print"]);
  assert.equal(medicalRecordListTitle({ testName: "CBC", name: "City Lab" }), "CBC");
  assert.equal(medicalRecordHasFile({ fileData: TINY_PNG }), true);
  assert.equal(medicalRecordHasFile({ fileName: "cbc.pdf" }), false);
  const partnerFile = medicalRecordForViewer({
    reportFileData: TINY_PNG,
    reportFileName: "cbc.png",
    reportFileType: "image/png",
  });
  assert.equal(partnerFile.fileData, TINY_PNG);
  assert.equal(partnerFile.fileName, "cbc.png");
  assert.ok(medicalRecordObjectUrl(partnerFile));

  const clicks = [];
  const created = [];
  const doc = {
    createElement(tag) {
      const el = {
        tag,
        href: "",
        download: "",
        click() {
          clicks.push(this.download);
        },
      };
      created.push(el);
      return el;
    },
    body: {
      appendChild() {},
      removeChild() {},
    },
  };
  assert.equal(
    downloadMedicalRecordFile(
      { fileData: TINY_PNG, fileName: "cbc.png", fileType: "image/png" },
      doc
    ),
    true
  );
  assert.equal(clicks[0], "cbc.png");
  assert.equal(
    downloadMedicalRecordFile(
      {
        testName: "CBC",
        fileData: TINY_PNG,
        fileName: "report.pdf",
        fileType: "image/png",
      },
      doc
    ),
    true
  );
  assert.equal(clicks[1], "CBC.png");

  let printed = false;
  const popup = {
    addEventListener(type, fn) {
      if (type === "load") fn();
    },
    focus() {},
    print() {
      printed = true;
    },
  };
  assert.equal(
    printMedicalRecordFile(
      { fileData: TINY_PNG, fileName: "cbc.png", fileType: "image/png" },
      { open: () => popup }
    ),
    true
  );
  assert.equal(printed, true);
});

test("customer uploads keep the selected patient's id, name and mobile", () => {
  const person = { id: "fam-1", name: "Aarav Sharma", mobile: "9876543210" };
  const row = buildCustomerMedicalRecord(
    "lab",
    {
      memberId: "fam-1",
      testName: "CBC",
      date: "2026-09-27",
      fileName: "cbc.pdf",
    },
    { id: "lab-aarav", person }
  );
  assert.equal(row.patientId, "fam-1");
  assert.equal(row.patientName, "Aarav Sharma");
  assert.equal(row.memberId, "fam-1");
  assert.equal(row.mobile, "9876543210");
  const holder = buildCustomerMedicalRecord(
    "prescription",
    { date: "2026-09-27", fileName: "rx.pdf" },
    { id: "rx-anita", person: { id: "self", name: "Anita Sharma", mobile: "9876543210" } }
  );
  const rows = [row, holder];
  assert.deepEqual(
    recordsForPatient(rows, "fam-1").map((item) => item.id),
    ["lab-aarav"]
  );
  assert.deepEqual(
    recordsForPatient(rows, "self").map((item) => item.id),
    ["rx-anita"]
  );
});

test("upload details require a patient when more than one person is listed", () => {
  const people = [
    { id: "self", name: "Anita" },
    { id: "fam-1", name: "Aarav" },
  ];
  assert.equal(
    validateMedicalUploadDetails("lab", { date: "2026-09-27", testName: "CBC" }, { people })
      .memberId,
    "Select whose report this is."
  );
  assert.deepEqual(
    validateMedicalUploadDetails(
      "lab",
      { date: "2026-09-27", testName: "CBC", memberId: "fam-1" },
      { people }
    ),
    {}
  );
});

test("active tab is a hard filter after a patient is opened", () => {
  const people = [
    { id: "self", name: "Anita Sharma", mobile: "9876543210" },
    { id: "fam-1", name: "Aarav Sharma", mobile: "9876543210" },
  ];
  const rows = [
    {
      id: "lab-anita",
      kind: "lab",
      patientId: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
      testName: "CBC",
    },
    {
      id: "img-anita",
      kind: "radiology",
      patientId: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
      testName: "X-Ray Chest",
    },
    {
      id: "rx-anita",
      kind: "prescription",
      patientId: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
      testName: "Prescription",
    },
    {
      id: "vax-anita",
      kind: "vaccination",
      patientId: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
      testName: "BCG",
    },
    {
      id: "lab-aarav",
      kind: "lab",
      patientId: "fam-1",
      patientName: "Aarav Sharma",
      mobile: "9876543210",
      testName: "Lipid Profile",
    },
    {
      id: "img-other",
      kind: "radiology",
      patientId: "other:bob",
      patientName: "Bob",
      testName: "MRI Brain",
    },
  ];

  assert.deepEqual(
    recordsForActiveTab(rows, "lab").map((row) => row.id),
    ["lab-anita", "lab-aarav"]
  );
  assert.deepEqual(
    recordsForActiveTab(rows, "lab", "self", people).map((row) => row.id),
    ["lab-anita"]
  );
  assert.equal(
    recordsForActiveTab(rows, "lab", "self", people).some((row) => row.kind !== "lab"),
    false
  );
  assert.deepEqual(
    recordsForActiveTab(rows, "imaging", "self", people).map((row) => row.id),
    ["img-anita"]
  );
  assert.deepEqual(
    recordsForActiveTab(rows, "prescription", "self", people).map((row) => row.id),
    ["rx-anita"]
  );
  assert.deepEqual(
    recordsForActiveTab(rows, "vaccination", "self", people).map((row) => row.id),
    ["vax-anita"]
  );
  assert.deepEqual(recordsInSection(rows, "all"), []);
  assert.deepEqual(recordsInSection(rows, ""), []);
  assert.deepEqual(
    recordsForActiveTab(rows, "all").map((row) => row.kind),
    ["lab", "lab"]
  );
  assert.deepEqual(
    recordsInSection(rows, "imaging").map((row) => row.id),
    ["img-anita", "img-other"]
  );

  const labPatients = patientsForActiveTab(rows, "lab", people);
  assert.equal(
    labPatients.some((row) => row.id === "other:bob" || row.patientId === "other:bob"),
    false
  );
  assert.equal(labPatients.some((row) => row.id === "self"), true);
  assert.equal(labPatients.some((row) => row.id === "fam-1"), true);

  const imagingPatients = patientsForActiveTab(rows, "radiology", []);
  assert.deepEqual(
    imagingPatients.map((row) => row.id),
    ["self", "other:bob"]
  );
  assert.equal(
    recordsForActiveTab(rows, "radiology", "other:bob", imagingPatients).some(
      (row) => row.kind !== "radiology"
    ),
    false
  );
});

test("one patient record groups every file for that person", () => {
  const people = [
    { id: "self", name: "Anita Sharma", mobile: "9876543210" },
    { id: "fam-1", name: "Aarav Sharma", mobile: "9876543210" },
  ];
  const rows = [
    {
      id: "lab-anita",
      kind: "lab",
      patientId: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
      testName: "CBC",
      fileName: "CBC.pdf",
      date: "2026-09-27",
    },
    {
      id: "img-anita",
      kind: "radiology",
      patientId: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
      testName: "X-Ray Chest",
      fileName: "X-Ray Chest.pdf",
      date: "2026-09-26",
    },
    {
      id: "lab-aarav",
      kind: "lab",
      patientId: "fam-1",
      patientName: "Aarav Sharma",
      mobile: "9876543210",
      testName: "Lipid Profile",
      fileName: "Lipid Profile.pdf",
      date: "2026-09-25",
    },
  ];
  const patients = uniquePatientsFromRecords(rows, people);
  assert.deepEqual(
    patients.map((row) => row.patientId),
    ["self", "fam-1"]
  );
  assert.deepEqual(medicalRecordPatientCard(patients[0]), {
    primary: "Anita Sharma",
    secondary: "9876543210",
  });
  const anita = recordsForPatient(rows, "self", people);
  assert.deepEqual(
    anita.map((row) => row.id),
    ["lab-anita", "img-anita"]
  );
  const aarav = recordsForPatient(rows, "fam-1", people);
  assert.deepEqual(
    aarav.map((row) => row.id),
    ["lab-aarav"]
  );
  assert.equal(aarav.some((row) => row.patientId === "self"), false);
  assert.deepEqual(medicalRecordFileCard(anita[0]), {
    kind: "lab",
    primary: "CBC.pdf",
    secondary: "2026-09-27",
  });
  assert.deepEqual(medicalRecordFileCard(anita[1]), {
    kind: "radiology",
    primary: "X-Ray Chest.pdf",
    secondary: "2026-09-26",
  });
});

test("opened report object url is reused and not revoked on remount", () => {
  const record = {
    fileData: TINY_PNG,
    fileName: "CBC.png",
    fileType: "image/png",
    testName: "CBC",
  };
  const first = medicalRecordObjectUrl(record);
  const second = medicalRecordObjectUrl({ ...record });
  assert.ok(first);
  assert.equal(first, second);
});

test("partner-uploaded lab and imaging stay in their report sections", () => {
  const rows = [
    { id: "ord-1", kind: "lab", source: "partner", testName: "CBC" },
    { id: "ord-2", kind: "radiology", source: "partner", testName: "MRI Brain" },
    { id: "rx-1", kind: "prescription", source: "customer", name: "Clinic Rx" },
    { id: "vax-1", kind: "vaccination", source: "partner", testName: "BCG" },
  ];
  assert.deepEqual(
    recordsInSection(rows, "lab").map((row) => row.id),
    ["ord-1"]
  );
  assert.deepEqual(
    recordsInSection(rows, "radiology").map((row) => row.id),
    ["ord-2"]
  );
  assert.deepEqual(
    recordsInSection(rows, "prescription").map((row) => row.id),
    ["rx-1"]
  );
  assert.deepEqual(
    recordsInSection(rows, "vaccination").map((row) => row.id),
    ["vax-1"]
  );
});

test("vaccination records are patient-wise and open in the local viewer", () => {
  const people = [
    { id: "self", name: "Asha", mobile: "9876543210" },
    { id: "fam-1", name: "Aarav Sharma", mobile: "9876543210" },
  ];
  const dose = {
    id: "vacd-asha",
    personId: "vacp-other",
    personName: "Asha",
    vaccineName: "Seasonal Influenza (Annual)",
    givenOn: "2026-09-01",
    status: "given",
  };
  const fromStore = vaccinationDoseAsMedicalRecord(dose, people);
  assert.equal(fromStore.kind, "vaccination");
  assert.equal(fromStore.patientId, "self");
  assert.equal(fromStore.patientName, "Asha");
  assert.equal(fromStore.testName, "Seasonal Influenza (Annual)");
  const viewed = medicalRecordForViewer(fromStore);
  assert.match(viewed.fileData, /^data:text\/html/);
  assert.match(viewed.fileName, /Seasonal Influenza/);
  assert.match(vaccinationCertificateHtml(fromStore), /Asha/);
  assert.match(vaccinationCertificateHtml(fromStore), /Seasonal Influenza/);

  const fromOrder = {
    id: "MH-VAC-1",
    kind: "vaccination",
    patientName: "Aarav Sharma",
    mobile: "9876543210",
    trackCompleted: true,
    items: [{ name: "Nurse Visit · Children Vaccination" }, { name: "BCG" }],
    date: "2026-08-15",
  };
  const collected = collectMedicalRecords(
    [
      {
        id: "lab-asha",
        kind: "lab",
        patientId: "self",
        patientName: "Asha",
        testName: "CBC",
      },
    ],
    { vaxStore: { people: [], doses: [dose] }, orders: [fromOrder], people }
  );
  assert.equal(
    recordsInSection(collected, "lab").some((row) => row.id === "lab-asha"),
    true
  );
  const vaxRows = recordsInSection(collected, "vaccination");
  assert.equal(vaxRows.some((row) => row.testName.includes("Influenza")), true);
  assert.equal(vaxRows.some((row) => row.testName === "BCG"), true);
  assert.deepEqual(
    recordsForPatient(vaxRows, "self", people).map((row) => row.patientName),
    ["Asha"]
  );
  assert.equal(
    recordsForPatient(vaxRows, "fam-1", people).some((row) => row.testName === "BCG"),
    true
  );
});
