import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  alreadyNotifiedCustomer,
  alreadyNotifiedCustomerType,
  diagnosticReportTestName,
  shouldNotifyCustomerReportReady,
} from "./customerNotify.mjs";

test("does not stack unread slot-offer notices for the same order", () => {
  assert.equal(
    alreadyNotifiedCustomer(
      [
        {
          mobile: "9654222901",
          orderId: "MH-RAD-1",
          type: "slot_offer",
          readAt: null,
        },
      ],
      "9654222901",
      "MH-RAD-1",
      "slot_offer"
    ),
    true
  );
  assert.equal(
    alreadyNotifiedCustomer(
      [
        {
          mobile: "9654222901",
          orderId: "MH-RAD-1",
          type: "slot_offer",
          readAt: Date.now(),
        },
      ],
      "9654222901",
      "MH-RAD-1",
      "slot_offer"
    ),
    false
  );
});

test("report-ready notify fires once when status or file is first saved", () => {
  const existing = {
    kind: "lab",
    trackStatus: "sample_collected",
  };
  const uploaded = {
    kind: "lab",
    trackStatus: "report_ready",
    reportFileData: "data:application/pdf;base64,aaa",
    reportTestName: "CBC",
  };
  assert.equal(shouldNotifyCustomerReportReady(existing, uploaded), true);
  assert.equal(shouldNotifyCustomerReportReady(uploaded, uploaded), false);
  assert.equal(
    shouldNotifyCustomerReportReady(uploaded, {
      ...uploaded,
      reportNotes: "Signed",
    }),
    false
  );
  assert.equal(
    shouldNotifyCustomerReportReady(existing, {
      kind: "lab",
      trackStatus: "done",
      trackCompleted: true,
      reportFileData: "data:application/pdf;base64,aaa",
    }),
    true
  );
  assert.equal(
    shouldNotifyCustomerReportReady(existing, {
      kind: "radiology",
      reportFileData: "data:image/png;base64,bbb",
    }),
    true
  );
  assert.equal(
    shouldNotifyCustomerReportReady(existing, {
      kind: "stepdown",
      trackStatus: "report_ready",
    }),
    false
  );
});

test("same order does not get a second report-ready notice after it was read", () => {
  assert.equal(
    alreadyNotifiedCustomerType(
      [
        {
          mobile: "9654222901",
          orderId: "MH-LAB-9",
          type: "report_ready",
          readAt: Date.now(),
        },
      ],
      "9654222901",
      "MH-LAB-9",
      "report_ready"
    ),
    true
  );
  assert.equal(
    alreadyNotifiedCustomerType(
      [
        {
          mobile: "9654222901",
          orderId: "MH-LAB-9",
          type: "slot_offer",
          readAt: null,
        },
      ],
      "9654222901",
      "MH-LAB-9",
      "report_ready"
    ),
    false
  );
});

test("report-ready notice body uses test name and order id", () => {
  assert.equal(diagnosticReportTestName({ reportTestName: "Lipid Profile" }), "Lipid Profile");
  assert.equal(
    diagnosticReportTestName({ tests: [{ name: "CBC" }, { name: "ESR" }] }),
    "CBC, ESR"
  );
  assert.equal(diagnosticReportTestName({}), "Diagnostic report");
});

test("partner job PATCH calls report-ready customer notify", async () => {
  const source = await readFile(new URL("./handler.mjs", import.meta.url), "utf8");
  assert.match(source, /shouldNotifyCustomerReportReady\(existing, updated\)/);
  assert.match(source, /await notifyCustomerReportReady\(updated\)/);
});
