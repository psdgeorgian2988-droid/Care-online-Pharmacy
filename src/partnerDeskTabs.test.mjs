import assert from "node:assert/strict";
import { test } from "node:test";
import {
  jobsForPartnerDeskTab,
  labDeskAllowsPaymentCollect,
  partnerDeskNeedsPaymentCollect,
  partnerDeskTab,
  partnerDeskTabsFor,
  partnerJobTrackKey,
  usesPartnerServiceDesk,
} from "./partnerDeskTabs.js";

test("lab and home-care desks use pharmacy-style tabs; doctor, delivery, and step-down do not", () => {
  assert.equal(usesPartnerServiceDesk("lab"), true);
  assert.equal(usesPartnerServiceDesk("homecare"), true);
  assert.equal(usesPartnerServiceDesk("psychologist"), true);
  assert.equal(usesPartnerServiceDesk("ambulance"), true);
  assert.equal(usesPartnerServiceDesk("doctor"), false);
  assert.equal(usesPartnerServiceDesk("stepdown"), false);
  assert.equal(
    usesPartnerServiceDesk("medicine", { kinds: ["medicine"], role: "Medicine rider" }),
    false
  );
});

test("radiology jobs land on New orders until the centre accepts", () => {
  assert.equal(
    partnerDeskTab({ trackStatus: "requested", partnerConfirmStatus: "pending" }, "radiology"),
    "new"
  );
  assert.equal(
    partnerDeskTab({ trackStatus: "confirmed", partnerConfirmed: true }, "radiology"),
    "approved"
  );
  assert.equal(partnerDeskTab({ trackStatus: "report_ready" }, "radiology"), "reports");
  assert.deepEqual(
    partnerDeskTabsFor("radiology").map((tab) => tab.id),
    ["new", "approved", "assigned", "reports", "done"]
  );
});

test("lab jobs split into new, approved, sample, upload report, and order complete", () => {
  assert.equal(partnerDeskTab({ trackStatus: "requested", partnerConfirmStatus: "pending" }, "lab"), "new");
  assert.equal(partnerDeskTab({ trackStatus: "confirmed", partnerConfirmed: true }, "lab"), "approved");
  assert.equal(partnerDeskTab({ trackStatus: "assigned", partnerConfirmed: true }, "lab"), "assigned");
  assert.equal(partnerDeskTab({ trackStatus: "sample_collected" }, "lab"), "upload");
  assert.equal(partnerDeskTab({ trackStatus: "sample_collected", paymentStatus: "paid" }, "lab"), "upload");
  assert.equal(partnerDeskTab({ kind: "lab", trackStatus: "report_ready" }, "lab"), "upload");
  assert.equal(
    partnerDeskTab({ kind: "lab", trackStatus: "report_ready", trackCompleted: true }, "lab"),
    "done"
  );
  assert.equal(partnerDeskTab({ trackStatus: "done", trackCompleted: true }, "lab"), "done");
  assert.deepEqual(
    jobsForPartnerDeskTab(
      [
        { id: "n1", kind: "lab", trackStatus: "requested" },
        { id: "a1", kind: "lab", trackStatus: "confirmed", partnerConfirmed: true },
        { id: "s1", kind: "lab", trackStatus: "sample_collected" },
        { id: "r1", kind: "lab", trackStatus: "report_ready" },
      ],
      "upload",
      "lab"
    ).map((row) => row.id),
    ["n1", "a1", "s1", "r1"]
  );
  assert.deepEqual(
    jobsForPartnerDeskTab(
      [
        { id: "n1", kind: "lab", trackStatus: "requested" },
        { id: "s1", kind: "lab", trackStatus: "sample_collected" },
        { id: "r1", kind: "lab", trackStatus: "report_ready" },
        { id: "d1", kind: "lab", trackStatus: "done", trackCompleted: true },
      ],
      "upload",
      "lab"
    ).map((row) => row.id),
    ["n1", "s1", "r1"]
  );
  assert.deepEqual(
    jobsForPartnerDeskTab(
      [
        { id: "s1", kind: "lab", trackStatus: "sample_collected" },
        { id: "r1", kind: "lab", trackStatus: "report_ready" },
        { id: "d1", kind: "lab", trackStatus: "done", trackCompleted: true },
      ],
      "done",
      "lab"
    ).map((row) => row.id),
    ["d1"]
  );
  assert.deepEqual(
    jobsForPartnerDeskTab(
      [
        { id: "s1", trackStatus: "sample_collected" },
        { id: "a1", trackStatus: "assigned", partnerConfirmed: true },
        { id: "r1", trackStatus: "report_ready" },
      ],
      "sample",
      "lab"
    ).map((row) => row.id),
    ["s1"]
  );
  assert.deepEqual(
    partnerDeskTabsFor("lab").map((tab) => tab.id),
    ["new", "approved", "assigned", "sample", "upload", "done"]
  );
  assert.equal(
    partnerDeskTabsFor("lab").some((tab) => tab.id === "reports" || tab.label === "Report ready"),
    false
  );
  assert.equal(partnerDeskTabsFor("lab").find((tab) => tab.id === "upload")?.label, "Upload report");
  assert.equal(partnerDeskTabsFor("lab").find((tab) => tab.id === "done")?.label, "Order complete");
});

test("home-care on the way stays off the new-orders tab", () => {
  assert.equal(partnerJobTrackKey({ trackStatus: "on_the_way" }, "homecare"), "on_the_way");
  assert.equal(partnerDeskTab({ trackStatus: "on_the_way" }, "homecare"), "progress");
});

test("lab payment collect is only on the Sample collected tab", () => {
  const unpaidLab = { kind: "lab", trackStatus: "sample_collected", paymentStatus: "cod" };
  assert.equal(labDeskAllowsPaymentCollect("sample"), true);
  assert.equal(labDeskAllowsPaymentCollect("sample_collected"), true);
  assert.equal(labDeskAllowsPaymentCollect("new"), false);
  assert.equal(labDeskAllowsPaymentCollect("approved"), false);
  assert.equal(labDeskAllowsPaymentCollect("assigned"), false);
  assert.equal(labDeskAllowsPaymentCollect("reports"), false);
  assert.equal(labDeskAllowsPaymentCollect("upload"), false);
  assert.equal(labDeskAllowsPaymentCollect("done"), false);
  assert.equal(partnerDeskNeedsPaymentCollect(unpaidLab, { tabId: "sample", kind: "lab" }), true);
  assert.equal(partnerDeskNeedsPaymentCollect(unpaidLab, { tabId: "upload", kind: "lab" }), false);
  assert.equal(partnerDeskNeedsPaymentCollect(unpaidLab, { tabId: "assigned", kind: "lab" }), false);
  assert.equal(
    partnerDeskNeedsPaymentCollect(
      { ...unpaidLab, paymentStatus: "paid" },
      { tabId: "sample", kind: "lab", paid: true }
    ),
    false
  );
  assert.equal(
    partnerDeskNeedsPaymentCollect(
      { kind: "homecare", paymentStatus: "cod" },
      { tabId: "assigned", kind: "homecare" }
    ),
    true
  );
  const prepaidLab = {
    kind: "lab",
    trackStatus: "sample_collected",
    paymentMethod: "upi",
    paymentStatus: "paid",
    paid: true,
    paidOn: "customer",
  };
  assert.equal(
    partnerDeskNeedsPaymentCollect(prepaidLab, { tabId: "sample", kind: "lab" }),
    false
  );
  assert.equal(
    partnerDeskNeedsPaymentCollect(
      { ...prepaidLab, paid: true, paymentStatus: "paid", paidOn: "customer" },
      { tabId: "sample", kind: "lab" }
    ),
    false
  );
});
