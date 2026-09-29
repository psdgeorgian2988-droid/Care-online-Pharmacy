import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DOCTOR_HOME_HASH,
  HOMECARE_HOME_HASH,
  isDoctorNavActive,
  isHomecareNavActive,
  isLabsNavActive,
  isMedicalRecordNavActive,
  isMedicineNavActive,
  isVaccinationNavActive,
  LABS_HOME_HASH,
  MEDICAL_RECORD_HOME_HASH,
  MEDICINE_HOME_HASH,
  parseAppHash,
  VACCINATION_HOME_HASH,
} from "./hashRoute.js";

const source = readFileSync(new URL("./AppBottomNav.jsx", import.meta.url), "utf8");

function tabBlockOrder() {
  const matches = [
    ...source.matchAll(/href:\s*([A-Z_]+|["']#[^"']+["']),\s*label:\s*"([^"]+)"/g),
  ];
  return matches.map((row) => ({ href: row[1].replace(/^["']|["']$/g, ""), label: row[2] }));
}

test("footer Medical Record hash opens the home records section", () => {
  const parsed = parseAppHash(MEDICAL_RECORD_HOME_HASH);
  assert.equal(MEDICAL_RECORD_HOME_HASH, "#home?service=reports");
  assert.equal(parsed.route, "#home");
  assert.equal(parsed.service, "reports");
  assert.equal(isMedicalRecordNavActive(parsed.route, parsed.service), true);
  assert.equal(isMedicalRecordNavActive("#reports", "lab"), true);
  assert.equal(isMedicalRecordNavActive("#home", "education"), false);
});

test("footer icons are Account first, then one home segment each", () => {
  assert.deepEqual(
    tabBlockOrder().map((tab) => tab.label),
    [
      "Account",
      "Medicines",
      "Labs",
      "Orders",
      "Doctor",
      "Medical Record",
      "Home Care",
      "Vaccination",
    ]
  );
  assert.match(source, /href: "#profile", label: "Account"/);
  assert.match(source, /href: MEDICINE_HOME_HASH, label: "Medicines"/);
  assert.match(source, /href: LABS_HOME_HASH, label: "Labs"/);
  assert.match(source, /href: "#myorders", label: "Orders"/);
  assert.match(source, /href: DOCTOR_HOME_HASH, label: "Doctor"/);
  assert.match(source, /href: MEDICAL_RECORD_HOME_HASH, label: "Medical Record"/);
  assert.match(source, /href: HOMECARE_HOME_HASH, label: "Home Care"/);
  assert.match(source, /href: VACCINATION_HOME_HASH, label: "Vaccination"/);
  assert.equal(LABS_HOME_HASH, "#home?service=labs");
  assert.equal(MEDICINE_HOME_HASH, "#home?service=medicine");
  assert.equal(DOCTOR_HOME_HASH, "#home?service=doctor");
  assert.equal(HOMECARE_HOME_HASH, "#home?service=homecare");
  assert.equal(VACCINATION_HOME_HASH, "#home?service=vaccination");
  assert.doesNotMatch(source, /href: "#reports"/);
  assert.doesNotMatch(source, /href: "#medicine-search"/);
  assert.doesNotMatch(source, /loggedIn && \(tab\.href === "#home"/);
  assert.match(source, /icon: "account"/);
  assert.match(source, /icon: "medicine"/);
  assert.match(source, /icon: "lab"/);
  assert.match(source, /icon: "orders"/);
  assert.match(source, /icon: "doctor"/);
  assert.doesNotMatch(source, /stroke="currentColor"/);
});

test("logged-in users still see section icons; guests hide Medical Record only", () => {
  assert.match(source, /tab\.href === MEDICAL_RECORD_HOME_HASH && !loggedIn/);
  assert.doesNotMatch(source, /tab\.href === "#home" \|\| tab\.href === "#medicine-search"/);
});

test("each footer icon is active only on its own segment", () => {
  assert.equal(isLabsNavActive("#home", "labs"), true);
  assert.equal(isLabsNavActive("#labs", ""), true);
  assert.equal(isLabsNavActive("#home", "lab"), true);
  assert.equal(isLabsNavActive("#home", "reports"), false);
  assert.equal(isMedicalRecordNavActive("#home", "reports"), true);
  assert.equal(isMedicalRecordNavActive("#home", "labs"), false);
  assert.equal(isMedicineNavActive("#home", "medicine"), true);
  assert.equal(isMedicineNavActive("#medicine-search", ""), true);
  assert.equal(isMedicineNavActive("#home", "labs"), false);
  assert.equal(isHomecareNavActive("#home", "homecare"), true);
  assert.equal(isHomecareNavActive("#homecare", "nurse"), true);
  assert.equal(isHomecareNavActive("#home", "medicine"), false);
  assert.equal(isDoctorNavActive("#home", "doctor"), true);
  assert.equal(isDoctorNavActive("#doctor", "gp"), true);
  assert.equal(isDoctorNavActive("#home", "labs"), false);
  assert.equal(isVaccinationNavActive("#home", "vaccination"), true);
  assert.equal(isVaccinationNavActive("#reports", "vaccination"), false);
  assert.equal(isMedicalRecordNavActive("#reports", "vaccination"), true);
});
