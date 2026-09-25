import assert from "node:assert/strict";
import { test } from "node:test";
import {
  jobsForPartnerDeskTab,
  partnerDeskTab,
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

test("lab jobs split into new, approved, sample, report ready, and completed", () => {
  assert.equal(partnerDeskTab({ trackStatus: "requested", partnerConfirmStatus: "pending" }, "lab"), "new");
  assert.equal(partnerDeskTab({ trackStatus: "confirmed", partnerConfirmed: true }, "lab"), "approved");
  assert.equal(partnerDeskTab({ trackStatus: "assigned", partnerConfirmed: true }, "lab"), "assigned");
  assert.equal(partnerDeskTab({ trackStatus: "sample_collected" }, "lab"), "sample");
  assert.equal(partnerDeskTab({ trackStatus: "report_ready" }, "lab"), "reports");
  assert.equal(partnerDeskTab({ trackStatus: "done", trackCompleted: true }, "lab"), "done");
  assert.deepEqual(
    jobsForPartnerDeskTab(
      [
        { id: "n1", trackStatus: "requested" },
        { id: "a1", trackStatus: "confirmed", partnerConfirmed: true },
      ],
      "approved",
      "lab"
    ).map((row) => row.id),
    ["a1"]
  );
});

test("home-care on the way stays off the new-orders tab", () => {
  assert.equal(partnerJobTrackKey({ trackStatus: "on_the_way" }, "homecare"), "on_the_way");
  assert.equal(partnerDeskTab({ trackStatus: "on_the_way" }, "homecare"), "progress");
});
