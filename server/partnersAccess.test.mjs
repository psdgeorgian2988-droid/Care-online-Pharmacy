import test from "node:test";
import assert from "node:assert/strict";
import { partnerCanAccessJob, publicPartner } from "../server/partners.mjs";

test("partner records keep a staff-set collection split percent", () => {
  const row = publicPartner({
    id: "P-X",
    name: "A",
    kinds: ["lab"],
    partnerPercent: 70,
  });
  assert.equal(row.partnerPercent, 70);
  const fallback = publicPartner({ id: "P-Y", name: "B", kinds: ["lab"] });
  assert.equal(fallback.partnerPercent, 85);
});

test("partner sees claimed jobs and pending requests for their kind", () => {
  const labPartner = { id: "P-LAB-01", kinds: ["lab"] };
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "lab",
      partnerId: "P-LAB-01",
      trackStatus: "confirmed",
      partnerConfirmed: true,
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "medicine",
      partnerId: "P-LAB-01",
      trackStatus: "confirmed",
      partnerConfirmed: true,
    }),
    false
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "lab",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
      partnerConfirmed: false,
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "ambulance",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
    }),
    false
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "lab",
      trackStatus: "confirmed",
      partnerConfirmed: true,
      partnerId: "P-OTHER",
    }),
    false
  );
});
