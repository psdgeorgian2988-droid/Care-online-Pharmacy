import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { HOME_SERVICE_TREE } from "./homeServiceTree.js";
import { labBookingHash } from "./hashRoute.js";
import { diagnosticPartnerRouteFields } from "./orderConfirm.js";
import { isExclusivePartnerId, partnerCanAccessJob } from "../server/partners.mjs";
import {
  blankDiagnosticBookingForm,
  diagnosticBookingFromHash,
  diagnosticBrandLabel,
  diagnosticBookingKind,
  knownDiagnosticPartnerId,
  shouldOpenSavedDiagnosticBooking,
} from "./labBooking.js";

test("lab and radiology hub cards open that partner’s booking hash", () => {
  const labs = HOME_SERVICE_TREE.find((row) => row.key === "lab");
  const metro = labs.items.find((row) => row.id === "lab-metropolis");
  const lal = labs.items.find((row) => row.id === "lab-lal-pathlabs");
  assert.equal(metro.href, labBookingHash("metropolis", "lab"));
  assert.equal(metro.href, "#labs?service=lab&lab=metropolis");
  assert.equal(lal.href, "#labs?service=lab&lab=lal-pathlabs");

  const imaging = HOME_SERVICE_TREE.find((row) => row.key === "radiology");
  const delhi = imaging.items.find((row) => row.id === "rad-rad-delhi");
  const gurgaon = imaging.items.find((row) => row.id === "rad-rad-gurgaon");
  assert.equal(delhi.href, labBookingHash("rad-delhi", "radiology"));
  assert.equal(delhi.href, "#labs?service=radiology&lab=rad-delhi");
  assert.equal(gurgaon.href, "#labs?service=radiology&lab=rad-gurgaon");
});

test("hash boot resolves known lab and radiology catalog brands", () => {
  assert.deepEqual(diagnosticBookingFromHash("#labs?service=lab&lab=metropolis"), {
    serviceType: "lab",
    labId: "metropolis",
    hash: "#labs?service=lab&lab=metropolis",
  });
  assert.deepEqual(diagnosticBookingFromHash("#labs?service=radiology&lab=rad-delhi"), {
    serviceType: "radiology",
    labId: "rad-delhi",
    hash: "#labs?service=radiology&lab=rad-delhi",
  });
  assert.equal(knownDiagnosticPartnerId("lab", "unknown-lab"), "");
  assert.equal(knownDiagnosticPartnerId("radiology", "green-park-imaging"), "");
  assert.equal(diagnosticBookingKind("radiology"), "radiology");
});

test("saved confirmation is not restored when a hub partner card is opened", () => {
  const leftover = {
    bookingId: "MH-LAB-111",
    preferredPartnerId: "lal-pathlabs",
    partnerConfirmStatus: "pending",
  };
  assert.equal(shouldOpenSavedDiagnosticBooking(leftover, { labId: "metropolis" }), false);
  assert.equal(shouldOpenSavedDiagnosticBooking(leftover, { labId: "rad-delhi" }), false);
  assert.equal(shouldOpenSavedDiagnosticBooking(leftover, {}), true);
  assert.equal(
    shouldOpenSavedDiagnosticBooking({ bookingId: "MH-1", paymentStatus: "paid" }, {}),
    false
  );
});

test("Metropolis and radiology catalog brands stay preferred, not exclusive partnerId", () => {
  const lab = diagnosticPartnerRouteFields({
    id: "metropolis",
    name: "Metropolis",
  });
  assert.equal(lab.partnerId, "");
  assert.equal(lab.preferredPartnerId, "metropolis");
  assert.equal(lab.preferredPartner, "Metropolis");
  assert.equal(isExclusivePartnerId("metropolis"), false);
  assert.equal(
    partnerCanAccessJob(
      { id: "P-LAB-01", kinds: ["lab"] },
      {
        kind: "lab",
        partnerId: lab.partnerId,
        preferredPartnerId: lab.preferredPartnerId,
        trackStatus: "requested",
        partnerConfirmStatus: "pending",
        partnerConfirmed: false,
      }
    ),
    true
  );

  const scan = diagnosticPartnerRouteFields({
    id: "rad-delhi",
    name: "MediHome Delhi",
  });
  assert.equal(scan.partnerId, "");
  assert.equal(scan.preferredPartnerId, "rad-delhi");
  assert.equal(isExclusivePartnerId("rad-delhi"), false);
  assert.equal(
    partnerCanAccessJob(
      { id: "P-RAD-01", kinds: ["radiology"] },
      {
        kind: "radiology",
        partnerId: scan.partnerId,
        preferredPartnerId: scan.preferredPartnerId,
        trackStatus: "requested",
        partnerConfirmStatus: "pending",
        partnerConfirmed: false,
      }
    ),
    true
  );
  assert.equal(
    partnerCanAccessJob({ id: "P-LAB-01", kinds: ["lab"] }, {
      kind: "radiology",
      preferredPartnerId: "rad-delhi",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
    }),
    false
  );
});

test("blank diagnostic form clears slot fields and keeps profile name when present", () => {
  const blank = blankDiagnosticBookingForm(null, null);
  assert.equal(blank.date, "");
  assert.equal(blank.timeSlot, "");
  assert.equal(blank.visitType, "home");
  const filled = blankDiagnosticBookingForm(
    { name: "Asha", mobile: "9876543210" },
    { name: "Asha", mobile: "9876543210" }
  );
  assert.equal(filled.patientName, "Asha");
  assert.equal(filled.date, "");
  assert.equal(diagnosticBrandLabel({ preferredPartner: "Metropolis" }), "Metropolis");
  assert.equal(diagnosticBrandLabel({ preferredLab: "MediHome Delhi" }), "MediHome Delhi");
});

test("LabTests and App wire hub clicks to the partner booking page", () => {
  const labTests = readFileSync(new URL("./LabTests.jsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const cart = readFileSync(new URL("./CartCheckout.jsx", import.meta.url), "utf8");
  assert.match(labTests, /labBookingHash\(labId, "lab"\)/);
  assert.match(labTests, /labBookingHash\(centreId, "radiology"\)/);
  assert.match(labTests, /shouldOpenSavedDiagnosticBooking/);
  assert.match(labTests, /blankDiagnosticBookingForm/);
  assert.match(labTests, /LABS_HOME_HASH/);
  assert.match(labTests, /isDiagnosticKind\(kind\)/);
  assert.match(app, /selectedLab \|\| peekRxLabCheckout/);
  assert.match(cart, /setForm\(\{ visitType: "home", date: "", timeSlot: "" \}\)/);
});
