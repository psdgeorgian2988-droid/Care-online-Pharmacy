import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignTechnicianFields,
  diagnosticCompleteFields,
  isDiagnosticKind,
  mergeOrderReportIntoStore,
  nextDiagnosticAction,
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
    "collect_payment"
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
});

test("field helpers set the right track status", () => {
  assert.equal(assignTechnicianFields({ name: "Neha", mobile: "9654222902" }).trackStatus, "assigned");
  assert.equal(sampleCollectedFields().trackStatus, "sample_collected");
  assert.equal(reportReadyFields({ fileName: "a.pdf" }).trackStatus, "report_ready");
  assert.equal(diagnosticCompleteFields().trackStatus, "done");
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
  const saved = JSON.parse(memory.getItem("mediHomeReports"));
  assert.equal(saved[0].testName, "CBC");
});
