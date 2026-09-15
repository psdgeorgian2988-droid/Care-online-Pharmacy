import test from "node:test";
import assert from "node:assert/strict";
import { partnerCanAccessJob } from "../server/partners.mjs";

test("partner sees claimed jobs and pending requests for their kind", () => {
  const labPartner = { id: "P-LAB-01", kinds: ["lab"] };
  assert.equal(
    partnerCanAccessJob(labPartner, {
      partnerId: "P-LAB-01",
      trackStatus: "confirmed",
      partnerConfirmed: true,
    }),
    true
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
