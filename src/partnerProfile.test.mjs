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
      specialty: "cardiologist",
      experienceYears: "8",
      email: "",
      aadhaarNumber: "1234 5678 9012",
      certificates: [{ name: "Lab licence", fileName: "lic.pdf", fileType: "application/pdf", fileData: "data:application/pdf;base64,YQ==" }],
      photoData: "data:image/png;base64,YQ==",
      photoName: "me.png",
      photoType: "image/png",
    },
  });
  assert.equal(profile.qualification, "DMLT");
  assert.equal(profile.specialty, "cardiologist");
  assert.equal(profile.experienceYears, "8");
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

test("profile photo keeps only jpg and png", () => {
  const png = partnerProfileFrom({
    profile: { photoData: "data:image/png;base64,YQ==", photoName: "a.png", photoType: "image/png" },
  });
  assert.equal(png.photoType, "image/png");
  const jpg = partnerProfileFrom({
    profile: { photoData: "data:image/jpeg;base64,YQ==", photoName: "a.jpg", photoType: "image/jpeg" },
  });
  assert.equal(jpg.photoName, "a.jpg");
  assert.equal(jpg.photoType, "image/jpeg");
  const gif = partnerProfileFrom({
    profile: { photoData: "data:image/gif;base64,YQ==", photoName: "a.gif" },
  });
  assert.equal(gif.photoData, "");
});

test("profile drops a file that is not a photo or pdf", () => {
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
  assert.equal(
    visitingPartnerProfile({
      ...order,
      teamMemberId: "T-9",
      partnerProfile: { id: "T-9", name: "Ravi Kumar" },
    }).name,
    "Ravi Kumar"
  );
});
