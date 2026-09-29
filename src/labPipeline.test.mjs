import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignTechnicianFields,
  dataUrlToBytes,
  diagnosticCompleteFields,
  findStoredReport,
  isDiagnosticKind,
  isLabReportUploadFile,
  labJobCanReceiveReport,
  labReportTargetJob,
  mergeOrderReportIntoStore,
  nextDiagnosticAction,
  openReportFile,
  diagnosticTestName,
  namedReportFileName,
  reportFileForOrder,
  reportReadyFields,
  sampleCollectedFields,
} from "./labPipeline.js";

test("lab and radiology are diagnostic kinds", () => {
  assert.equal(isDiagnosticKind("lab"), true);
  assert.equal(isDiagnosticKind("radiology"), true);
  assert.equal(isDiagnosticKind("medicine"), false);
});

test("partner pipeline advances confirm → technician → sample → report → done", () => {
  assert.equal(
    nextDiagnosticAction({ kind: "lab", partnerConfirmStatus: "pending" }),
    "confirm"
  );
  assert.equal(
    nextDiagnosticAction({
      kind: "radiology",
      partnerConfirmStatus: "slot_offered",
      slotConfirmStatus: "offered",
    }),
    "await_customer_slot"
  );
  assert.equal(
    nextDiagnosticAction({
      kind: "lab",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
      trackStatus: "confirmed",
    }),
    "assign_technician"
  );
  assert.equal(
    nextDiagnosticAction({
      kind: "lab",
      partnerConfirmed: true,
      trackStatus: "assigned",
      technicianName: "Asha",
    }),
    "sample_collect"
  );
  assert.equal(
    nextDiagnosticAction({
      kind: "lab",
      partnerConfirmed: true,
      trackStatus: "sample_collected",
      paymentStatus: "cod",
    }),
    "upload_report"
  );
  assert.equal(
    nextDiagnosticAction({
      kind: "lab",
      partnerConfirmed: true,
      trackStatus: "sample_collected",
      paymentStatus: "paid",
    }),
    "upload_report"
  );
  assert.equal(
    nextDiagnosticAction({
      kind: "lab",
      partnerConfirmed: true,
      trackStatus: "report_ready",
      paymentStatus: "paid",
    }),
    "complete"
  );
  assert.equal(
    nextDiagnosticAction({
      kind: "lab",
      partnerConfirmed: true,
      trackStatus: "done",
      trackCompleted: true,
    }),
    ""
  );
});

test("lab report upload accepts PDF or photo and rejects other types", () => {
  assert.equal(isLabReportUploadFile({ name: "cbc.pdf", type: "application/pdf" }), true);
  assert.equal(isLabReportUploadFile({ name: "scan.jpg", type: "image/jpeg" }), true);
  assert.equal(isLabReportUploadFile({ name: "notes.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), false);
  assert.equal(isLabReportUploadFile({ name: "data.csv", type: "text/csv" }), false);
});

test("field helpers set the right track status", () => {
  assert.equal(assignTechnicianFields({ name: "Neha", mobile: "9654222902" }).trackStatus, "assigned");
  assert.equal(sampleCollectedFields().trackStatus, "sample_collected");
  const uploaded = reportReadyFields({ fileName: "a.pdf", fileData: "data:application/pdf;base64,aaa" });
  assert.equal(uploaded.trackStatus, "done");
  assert.equal(uploaded.trackCompleted, true);
  assert.equal(uploaded.status, "Completed");
  assert.equal(uploaded.reportFileName, "a.pdf");
  assert.equal(uploaded.reportFileData, "data:application/pdf;base64,aaa");
  const named = reportReadyFields({
    fileName: "report.pdf",
    fileType: "application/pdf",
    fileData: "data:application/pdf;base64,aaa",
    testName: "CBC",
  });
  assert.equal(named.reportFileName, "CBC.pdf");
  assert.equal(named.reportTestName, "CBC");
  assert.equal(diagnosticCompleteFields().trackStatus, "done");
});

test("upload binds to the selected incomplete lab job, including new orders", () => {
  const fresh = { id: "MH-LAB-678545", kind: "lab", trackStatus: "requested", partnerConfirmStatus: "pending" };
  const collected = { id: "MH-LAB-2", kind: "lab", trackStatus: "sample_collected" };
  const done = { id: "MH-LAB-3", kind: "lab", trackStatus: "done", trackCompleted: true };
  assert.equal(labJobCanReceiveReport(fresh), true);
  assert.equal(labJobCanReceiveReport(collected), true);
  assert.equal(labJobCanReceiveReport(done), false);
  assert.equal(labReportTargetJob([done, collected, fresh], "MH-LAB-678545").id, "MH-LAB-678545");
  assert.equal(labReportTargetJob([done, collected], "").id, "MH-LAB-2");
  assert.equal(labReportTargetJob([done], "MH-LAB-3").id, "MH-LAB-3");
  assert.equal(labReportTargetJob([done], "").id, "MH-LAB-3");
});

test("partner report merges into local reports store", () => {
  const memory = {
    data: {},
    getItem(key) {
      return Object.hasOwn(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
  };
  const row = mergeOrderReportIntoStore(
    {
      id: "MH-LAB-1",
      kind: "lab",
      patientName: "Riya",
      reportFileName: "cbc.pdf",
      reportFileData: "data:application/pdf;base64,aaa",
      reportTestName: "CBC",
    },
    memory
  );
  assert.equal(row.orderId, "MH-LAB-1");
  assert.equal(row.patientName, "Riya");
  const saved = JSON.parse(memory.getItem("mediHomeReports"));
  assert.equal(saved[0].testName, "CBC");
  assert.equal(saved[0].fileName, "CBC.pdf");
});

test("report file name is the test name plus the file type extension", () => {
  assert.equal(diagnosticTestName({ tests: [{ name: "CBC" }, { name: "KFT" }] }), "CBC, KFT");
  assert.equal(
    diagnosticTestName({ items: [{ testName: "X-Ray Chest" }], reportFileName: "scan.pdf" }),
    "X-Ray Chest"
  );
  assert.equal(
    namedReportFileName(
      { testName: "HbA1c - Diabetes Test" },
      { fileName: "report.pdf", fileType: "application/pdf" }
    ),
    "HbA1c - Diabetes Test.pdf"
  );
  assert.equal(
    namedReportFileName({ tests: [{ name: "CBC" }] }, { fileName: "photo.jpg", fileType: "image/jpeg" }),
    "CBC.jpg"
  );
});

test("partner report merge attaches the order patient, not a mixed account pile", () => {
  const memory = {
    data: {},
    getItem(key) {
      return Object.hasOwn(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
  };
  const people = [
    { id: "self", name: "Anita Sharma", mobile: "9876543210" },
    { id: "fam-1", name: "Aarav Sharma", mobile: "9876543210" },
  ];
  const family = mergeOrderReportIntoStore(
    {
      id: "MH-LAB-FAM",
      kind: "lab",
      bookedFor: "fam-1",
      patientName: "Aarav Sharma",
      mobile: "9876543210",
      reportFileName: "cbc.pdf",
      reportFileData: "data:application/pdf;base64,aaa",
      reportTestName: "CBC",
    },
    memory,
    people
  );
  const holder = mergeOrderReportIntoStore(
    {
      id: "MH-LAB-SELF",
      kind: "radiology",
      bookedFor: "self",
      patientName: "Anita Sharma",
      mobile: "9876543210",
      reportFileName: "xray.pdf",
      reportFileData: "data:application/pdf;base64,bbb",
      reportTestName: "X-Ray Chest",
    },
    memory,
    people
  );
  assert.equal(family.patientId, "fam-1");
  assert.equal(family.memberId, "fam-1");
  assert.equal(family.patientName, "Aarav Sharma");
  assert.equal(holder.patientId, "self");
  assert.equal(holder.patientName, "Anita Sharma");
  const saved = JSON.parse(memory.getItem("mediHomeReports"));
  assert.equal(saved.find((row) => row.orderId === "MH-LAB-FAM").patientId, "fam-1");
  assert.equal(saved.find((row) => row.orderId === "MH-LAB-SELF").patientId, "self");
});

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("open report uses partner file bytes, not an empty href", () => {
  const parsed = dataUrlToBytes(TINY_PNG, "image/png");
  assert.ok(parsed?.bytes?.length > 0);
  assert.equal(parsed.mime, "image/png");
  const opened = [];
  assert.equal(
    openReportFile(
      { fileData: TINY_PNG, fileName: "cbc.png", fileType: "image/png" },
      (url) => {
        opened.push(url);
        return { ok: true };
      }
    ),
    true
  );
  assert.equal(opened.length, 1);
  assert.notEqual(opened[0], "");
  assert.equal(openReportFile({ fileName: "cbc.pdf" }, () => ({ ok: true })), false);
});

test("report file falls back to mediHomeReports when the order only has a name", () => {
  const memory = {
    data: {},
    getItem(key) {
      return Object.hasOwn(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
  };
  mergeOrderReportIntoStore(
    {
      id: "MH-LAB-22",
      kind: "lab",
      reportFileName: "lipid.pdf",
      reportFileData: TINY_PNG,
      reportFileType: "image/png",
    },
    memory
  );
  const fromStore = reportFileForOrder({ id: "MH-LAB-22", reportFileName: "lipid.pdf" }, memory);
  assert.equal(fromStore.fileData, TINY_PNG);
  assert.equal(findStoredReport("MH-LAB-22", memory).fileName, "lipid.pdf");
});
