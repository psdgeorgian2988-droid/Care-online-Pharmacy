import assert from "node:assert/strict";
import { test } from "node:test";
import { reportFromOrder, reportMatches } from "./reports.mjs";

test("a saved order report keeps mobile and email for search", () => {
  const row = reportFromOrder({
    id: "MH-LAB-1",
    partnerId: "P-1",
    reportFileName: "cbc.pdf",
    reportFileData: "data:application/pdf;base64,aaa",
    patientName: "Neha",
    mobile: "98765 43210",
    email: "Neha@Lab.IN",
    reportTestName: "CBC",
  });
  assert.equal(row.mobile, "9876543210");
  assert.equal(row.email, "neha@lab.in");
  assert.equal(reportMatches(row, { mobile: "9876543210" }), true);
  assert.equal(reportMatches(row, { email: "neha@lab.in" }), true);
  assert.equal(reportMatches(row, { mobile: "9876543210", email: "other@lab.in" }), false);
  assert.equal(reportMatches(row, {}), false);
});

test("an order without a report file is not stored", () => {
  assert.equal(reportFromOrder({ id: "MH-LAB-2", mobile: "9876543210" }), null);
});
