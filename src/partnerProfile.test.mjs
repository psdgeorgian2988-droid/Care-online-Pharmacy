import test from "node:test";
import assert from "node:assert/strict";
import {
  kindsFromServices,
  loginIdFromContact,
  needsHomeVisitDocs,
  roleForPartner,
  uniqueLoginId,
  validatePartnerOnboard,
} from "./partnerProfile.js";

const pharmacy = {
  kinds: ["medicine"],
  businessName: "Care Medicos",
  contactName: "Ravi Kumar",
  mobile: "9810012345",
  email: "ravi.kumar@caremedicos.in",
  houseNo: "12",
  society: "Green Park",
  pinCode: "110016",
  accountName: "Care Medicos",
  accountNumber: "12345678901",
  ifsc: "HDFC0001234",
};

test("login ID is built from email local part and last four mobile digits", () => {
  assert.equal(loginIdFromContact("9810012345", "Ravi.Kumar@caremedicos.in"), "ravikumar.2345");
});

test("login ID falls back to the mobile number when email is missing", () => {
  assert.equal(loginIdFromContact("9810012345", ""), "9810012345");
});

test("duplicate login IDs get a numeric suffix", () => {
  assert.equal(uniqueLoginId(["ravikumar.2345"], "ravikumar.2345"), "ravikumar.2345-2");
});

test("physiotherapy is stored as home care with home-visit documents", () => {
  assert.deepEqual(kindsFromServices(["physiotherapy"]), ["homecare"]);
  assert.equal(needsHomeVisitDocs(["homecare"]), true);
  assert.equal(needsHomeVisitDocs(["medicine"], true), true);
  assert.equal(roleForPartner({ kinds: ["homecare"], physiotherapy: true }), "Physiotherapist");
});

test("pharmacy onboard needs business name, contact, bank and address", () => {
  assert.equal(validatePartnerOnboard(pharmacy), "");
  assert.match(validatePartnerOnboard({ ...pharmacy, businessName: "" }), /Business Name/);
  assert.match(validatePartnerOnboard({ ...pharmacy, ifsc: "ABC" }), /IFSC/);
});

test("home visit services need Aadhaar and police verification", () => {
  const home = {
    ...pharmacy,
    kinds: ["homecare"],
    businessName: "",
  };
  assert.match(validatePartnerOnboard(home), /Aadhaar/);
  assert.match(
    validatePartnerOnboard({
      ...home,
      aadhaar: { dataUrl: "data:image/jpeg;base64,xx" },
    }),
    /Police Verification/
  );
  assert.equal(
    validatePartnerOnboard({
      ...home,
      aadhaar: { dataUrl: "data:image/jpeg;base64,xx" },
      policeVerification: { dataUrl: "data:image/jpeg;base64,yy" },
    }),
    ""
  );
});
