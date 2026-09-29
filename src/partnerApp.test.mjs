import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPartnerDeskRoute,
  jobsForPartnerApp,
  partnerAppKind,
  partnerAppTitle,
  partnerDeskHash,
  partnerDeskKindFromRoute,
} from "./partnerApp.js";

test("a partner login is one app even if extra kinds are stored", () => {
  assert.equal(
    partnerAppKind({ kinds: ["medicine", "lab", "radiology"] }),
    "medicine"
  );
  assert.equal(partnerAppKind({ kinds: ["lab"] }), "lab");
  assert.equal(partnerAppTitle("medicine"), "Pharmacy Partner");
});

test("pharmacy desks never list lab or other partner-app jobs", () => {
  const pharmacy = { kinds: ["medicine", "lab"] };
  const jobs = jobsForPartnerApp(
    [
      { id: "m1", kind: "medicine" },
      { id: "l1", kind: "lab" },
      { id: "r1", kind: "radiology" },
      { id: "c1", kind: "cart" },
    ],
    pharmacy
  );
  assert.deepEqual(
    jobs.map((row) => row.id),
    ["m1", "c1"]
  );
});

test("lab desks never list pharmacy jobs", () => {
  const jobs = jobsForPartnerApp(
    [
      { id: "m1", kind: "medicine" },
      { id: "l1", kind: "lab" },
    ],
    { kinds: ["lab"] }
  );
  assert.deepEqual(
    jobs.map((row) => row.id),
    ["l1"]
  );
});

test("each partner app has its own desk hash", () => {
  assert.equal(partnerDeskHash("medicine"), "#pharmacy-desk");
  assert.equal(partnerDeskHash("lab"), "#lab-desk");
  assert.equal(
    partnerDeskHash("medicine", { kinds: ["medicine"], role: "Medicine rider" }),
    "#delivery-desk"
  );
  assert.equal(partnerDeskKindFromRoute("#pharmacy-desk"), "medicine");
  assert.equal(partnerDeskKindFromRoute("#delivery-desk"), "medicine");
  assert.equal(partnerDeskKindFromRoute("#partner-desk"), "");
  assert.equal(isPartnerDeskRoute("#lab-desk"), true);
  assert.equal(isPartnerDeskRoute("#delivery-desk"), true);
  assert.equal(isPartnerDeskRoute("#admin"), false);
});
