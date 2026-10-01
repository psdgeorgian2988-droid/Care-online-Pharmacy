import test from "node:test";
import assert from "node:assert/strict";
import {
  isDeclinedPartnerOrder,
  partnersForStaffAssign,
  showStaffAssignPartner,
  staffAssignPartnerPatch,
  staffNeedsPartnerAssign,
} from "./adminAssign.js";

const labPartners = [
  { id: "P-LAB-01", name: "Neha", kinds: ["lab"] },
  { id: "P-MED-01", name: "Amit", kinds: ["medicine"] },
  { id: "P-MULTI", name: "Scan", kinds: ["radiology", "lab"] },
  { id: "P-ANY", name: "General", kinds: [] },
];

test("assign partner is staff/admin only", () => {
  assert.equal(showStaffAssignPartner("staff"), true);
  assert.equal(showStaffAssignPartner("admin"), true);
  assert.equal(showStaffAssignPartner("customer"), false);
  assert.equal(showStaffAssignPartner("partner"), false);
});

test("staff assign dropdown lists partners for that service plus unassigned current", () => {
  const lab = partnersForStaffAssign(labPartners, "lab", "");
  assert.deepEqual(
    lab.map((row) => row.id),
    ["P-LAB-01", "P-MULTI", "P-ANY"]
  );
  const withCurrent = partnersForStaffAssign(labPartners, "lab", "P-MED-01");
  assert.equal(
    withCurrent.some((row) => row.id === "P-MED-01"),
    true
  );
  assert.deepEqual(partnersForStaffAssign([], "lab"), []);
});

test("staff needs assign when unassigned, declined, or partner did not take the job", () => {
  assert.equal(staffNeedsPartnerAssign({ kind: "lab", partnerId: "" }), true);
  assert.equal(
    staffNeedsPartnerAssign({
      kind: "lab",
      partnerId: "P-LAB-01",
      trackStatus: "declined",
      partnerConfirmStatus: "declined",
    }),
    true
  );
  assert.equal(
    staffNeedsPartnerAssign({
      kind: "lab",
      partnerId: "P-LAB-01",
      partnerConfirmed: false,
      partnerConfirmStatus: "pending",
    }),
    true
  );
  assert.equal(
    staffNeedsPartnerAssign({
      kind: "lab",
      partnerId: "P-LAB-01",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
    }),
    false
  );
  assert.equal(isDeclinedPartnerOrder({ trackStatus: "declined" }), true);
});

test("handleAssign staff patch sends partnerId and reopens a declined job", () => {
  const declined = {
    kind: "lab",
    partnerId: "P-OLD",
    trackStatus: "declined",
    trackCompleted: true,
    partnerConfirmStatus: "declined",
    partnerConfirmed: false,
  };
  const reopen = staffAssignPartnerPatch(declined, "P-LAB-01");
  assert.equal(reopen.partnerId, "P-LAB-01");
  assert.equal(reopen.trackStatus, "requested");
  assert.equal(reopen.trackCompleted, false);
  assert.equal(reopen.partnerConfirmStatus, "pending");
  assert.equal(staffAssignPartnerPatch({ kind: "lab", partnerId: "" }, "P-LAB-01").partnerId, "P-LAB-01");
  assert.deepEqual(staffAssignPartnerPatch(declined, ""), { partnerId: "" });
  const taken = staffAssignPartnerPatch(
    {
      kind: "lab",
      partnerId: "P-LAB-01",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
      trackStatus: "assigned",
    },
    "P-MULTI"
  );
  assert.deepEqual(taken, { partnerId: "P-MULTI" });
});
