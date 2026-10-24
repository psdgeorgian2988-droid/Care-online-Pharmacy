import test from "node:test";
import assert from "node:assert/strict";
import {
  customerPartnerProfile,
  homeVisitingPartnerId,
  partnerProfileFrom,
  visitingPartnerProfile,
} from "./partnerProfile.js";

test("partner profile keeps qualification, contact, and documents", () => {
  const profile = partnerProfileFrom({
    email: "lab@medihome.in",
    profile: {
      qualification: "DMLT",
      email: "",
      aadhaarNumber: "1234 5678 9012",
      certificates: [{ name: "Lab licence", fileName: "lic.pdf", fileType: "application/pdf", fileData: "data:application/pdf;base64,YQ==" }],
      photoData: "data:image/png;base64,YQ==",
      photoName: "me.png",
      photoType: "image/png",
    },
  });
  assert.equal(profile.qualification, "DMLT");
  assert.equal(profile.email, "lab@medihome.in");
  assert.equal(profile.aadhaarNumber, "123456789012");
  assert.equal(profile.certificates.length, 1);
  assert.equal(profile.photoName, "me.png");
});

test("customer view includes the assigned partner contact and documents", () => {
  const view = customerPartnerProfile({
    id: "P-1",
    name: "Kulkdeep Yadav",
    role: "Sample collection executive",
    mobile: "9654222988",
    address: "Gurgaon",
    pins: ["122016"],
    profile: { qualification: "DMLT", policeFileName: "police.pdf", policeFileType: "application/pdf", policeFileData: "data:application/pdf;base64,YQ==" },
  });
  assert.equal(view.name, "Kulkdeep Yadav");
  assert.equal(view.mobile, "9654222988");
  assert.equal(view.address, "Gurgaon");
  assert.equal(view.pinCode, "122016");
  assert.equal(view.qualification, "DMLT");
  assert.equal(view.policeFileName, "police.pdf");
});

test("partner profile drops files that are not a photo or pdf", () => {
  const profile = partnerProfileFrom({
    profile: { photoData: "data:text/html;base64,YQ==", aadhaarNumber: "12ab" },
  });
  assert.equal(profile.photoData, "");
  assert.equal(profile.aadhaarNumber, "12");
});

test("customer sees only the partner visiting the home", () => {
  assert.equal(
    homeVisitingPartnerId({ kind: "lab", visitType: "home", partnerId: "P-1", preferredPartnerId: "metropolis" }),
    "P-1"
  );
  assert.equal(
    homeVisitingPartnerId({ kind: "lab", preferredPartnerId: "metropolis" }),
    ""
  );
  assert.equal(
    homeVisitingPartnerId({ kind: "lab", visitType: "centre", partnerId: "P-1" }),
    ""
  );
  assert.equal(
    homeVisitingPartnerId({ kind: "medicine", partnerId: "P-STORE", deliveryPartnerId: "P-DOOR" }),
    "P-DOOR"
  );
  assert.equal(
    homeVisitingPartnerId({ kind: "doctor", visitType: "clinic", partnerId: "P-DOC" }),
    ""
  );
  assert.equal(
    homeVisitingPartnerId({ kind: "doctor", visitType: "home", partnerId: "P-DOC" }),
    "P-DOC"
  );
  const order = {
    kind: "lab",
    visitType: "home",
    partnerId: "P-1",
    partnerProfile: { id: "P-OTHER", name: "Someone else" },
  };
  assert.equal(visitingPartnerProfile(order), null);
  assert.equal(
    visitingPartnerProfile({ ...order, partnerProfile: { id: "P-1", name: "Kulkdeep" } }).name,
    "Kulkdeep"
  );
});
