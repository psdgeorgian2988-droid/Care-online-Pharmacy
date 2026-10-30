import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPartnerDeskRoute,
  jobsForPartnerApp,
  partnerAppKind,
  PARTNER_LOGIN_OPTIONS,
  partnerAppTitle,
  partnerDeskHash,
  partnerLoginOptionActive,
  partnerLoginTitle,
  partnerDeskKindFromRoute,
  partnerServesDesk,
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

test("the registration password opens the lab desk when lab is approved", () => {
  const partner = { kinds: ["medicine", "lab"], role: "Sample collection executive" };
  assert.equal(partnerAppKind(partner), "medicine");
  assert.equal(partnerServesDesk(partner, "lab"), true);
  assert.equal(partnerServesDesk({ kinds: ["lab"] }, "lab"), true);
  assert.equal(partnerServesDesk({ kinds: ["medicine"] }, "lab"), false);
  const jobs = jobsForPartnerApp(
    [
      { id: "m1", kind: "medicine" },
      { id: "l1", kind: "lab" },
    ],
    partner,
    "lab"
  );
  assert.deepEqual(
    jobs.map((row) => row.id),
    ["l1"]
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

test("partner login lists every partner type", () => {
  const labels = PARTNER_LOGIN_OPTIONS.map((row) => row.label);
  assert.ok(labels.includes("Lab"));
  assert.ok(labels.includes("Doctor"));
  assert.ok(labels.includes("Ambulance"));
  assert.ok(labels.includes("Nursing"));
  assert.ok(labels.includes("Caregiver"));
  assert.ok(labels.includes("Physiotherapy"));
  assert.ok(labels.includes("Pharmacy"));
  assert.ok(labels.includes("Radiology"));
  assert.ok(labels.includes("Vaccination"));
  assert.ok(labels.includes("Psychologist"));
  assert.ok(labels.includes("Step-down"));
  assert.ok(labels.includes("Delivery"));
  assert.equal(partnerLoginTitle("homecare", { service: "nurse" }), "Nursing Partner");
  assert.equal(partnerLoginTitle("homecare", { service: "caregiver" }), "Caregiver Partner");
  assert.equal(partnerLoginTitle("doctor"), "Doctor Partner");
  assert.equal(
    partnerLoginOptionActive(PARTNER_LOGIN_OPTIONS.find((row) => row.id === "lab"), {
      route: "#lab-desk",
    }),
    true
  );
  assert.equal(
    partnerLoginOptionActive(PARTNER_LOGIN_OPTIONS.find((row) => row.id === "nursing"), {
      route: "#homecare-desk",
      service: "nurse",
    }),
    true
  );
  assert.equal(
    partnerLoginOptionActive(PARTNER_LOGIN_OPTIONS.find((row) => row.id === "caregiver"), {
      route: "#homecare-desk",
      service: "nurse",
    }),
    false
  );
});
