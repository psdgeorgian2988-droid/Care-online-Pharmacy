import { DIAGNOSTIC_LABS, IMAGING_CENTRES } from "./diagnosticPartners";

export const SERVICE_KIND_OPTIONS = [
  { value: "homecare", label: "Home Care" },
  { value: "vaccination", label: "Vaccination" },
  { value: "lab", label: "Lab Tests" },
  { value: "radiology", label: "Radiology" },
  { value: "psychologist", label: "Psychologist Consultation" },
  { value: "stepdown", label: "Step-Down Care" },
  { value: "ambulance", label: "Ambulance" },
];

export const HOMECARE_BUILTIN = [
  { id: "homecare:im-inj", kind: "homecare", group: "nurse", name: "Nurse · IM injection", price: 249 },
  { id: "homecare:iv-inj", kind: "homecare", group: "nurse", name: "Nurse · IV injection", price: 349 },
  { id: "homecare:cannula", kind: "homecare", group: "nurse", name: "Nurse · Cannula", price: 499 },
  { id: "homecare:dress-small", kind: "homecare", group: "nurse", name: "Nurse · Dressing small", price: 299 },
  { id: "homecare:dress-medium", kind: "homecare", group: "nurse", name: "Nurse · Dressing medium", price: 499 },
  { id: "homecare:dress-large", kind: "homecare", group: "nurse", name: "Nurse · Dressing large", price: 799 },
  { id: "homecare:nurse-other", kind: "homecare", group: "nurse", name: "Nurse · Others", price: 999 },
  { id: "homecare:visit", kind: "homecare", group: "caregiver", name: "Caregiver · Short visit", price: 299 },
  { id: "homecare:fullday", kind: "homecare", group: "caregiver", name: "Caregiver · Full day", price: 1499 },
  { id: "homecare:weekly", kind: "homecare", group: "caregiver", name: "Caregiver · Weekly", price: 7499 },
  { id: "homecare:15days", kind: "homecare", group: "caregiver", name: "Caregiver · 15 days", price: 12499 },
  { id: "homecare:month", kind: "homecare", group: "caregiver", name: "Caregiver · Full month", price: 24999 },
  { id: "homecare:physio-1hr", kind: "homecare", group: "physiotherapy", name: "Physiotherapy · 1 hour", price: 799 },
  { id: "homecare:physio-2hr", kind: "homecare", group: "physiotherapy", name: "Physiotherapy · 2 hours", price: 1599 },
];

export const VACCINATION_BUILTIN = [
  { id: "vaccination:home-visit", kind: "vaccination", name: "Vaccination nurse home visit", price: 499 },
];

export const PSYCHOLOGIST_BUILTIN = [
  { id: "psychologist:video-45", kind: "psychologist", name: "Video 45 min", price: 999 },
  { id: "psychologist:video-60", kind: "psychologist", name: "Video 60 min", price: 1499 },
  { id: "psychologist:followup-30", kind: "psychologist", name: "Follow-up 30 min", price: 699 },
  { id: "psychologist:child-45", kind: "psychologist", name: "Child / teen 45 min", price: 1299 },
  { id: "psychologist:couple-60", kind: "psychologist", name: "Couple / family 60 min", price: 2499 },
  { id: "psychologist:home-60", kind: "psychologist", name: "Home visit 60 min", price: 1999 },
];

export const AMBULANCE_BUILTIN = [
  { id: "ambulance:emergency", kind: "ambulance", name: "Emergency ambulance", price: 3999 },
  { id: "ambulance:non-emergency", kind: "ambulance", name: "Non-emergency ambulance", price: 2499 },
];

export const STEPDOWN_BUILTIN = [
  { id: "stepdown:post-icu", kind: "stepdown", name: "Post-ICU step-down", price: 4999 },
  { id: "stepdown:post-surgery", kind: "stepdown", name: "Post-surgery recovery", price: 4999 },
  { id: "stepdown:rehab", kind: "stepdown", name: "Rehab & physiotherapy", price: 4999 },
  { id: "stepdown:wound", kind: "stepdown", name: "Wound / drain care", price: 4999 },
  { id: "stepdown:assisted", kind: "stepdown", name: "Assisted recovery at home", price: 4999 },
];

function uniqueTests(list, kind) {
  const seen = new Set();
  const rows = [];
  for (const partner of list) {
    for (const test of partner.tests || []) {
      if (seen.has(test.id)) continue;
      seen.add(test.id);
      rows.push({
        id: `${kind}:${test.id}`,
        kind,
        name: test.name,
        price: test.price,
      });
    }
  }
  return rows;
}

export const LAB_BUILTIN = uniqueTests(DIAGNOSTIC_LABS, "lab");
export const RADIOLOGY_BUILTIN = uniqueTests(IMAGING_CENTRES, "radiology");

export const BUILTIN_SERVICES = [
  ...HOMECARE_BUILTIN,
  ...VACCINATION_BUILTIN,
  ...LAB_BUILTIN,
  ...RADIOLOGY_BUILTIN,
  ...PSYCHOLOGIST_BUILTIN,
  ...STEPDOWN_BUILTIN,
  ...AMBULANCE_BUILTIN,
];

export function kindLabelForService(kind) {
  return SERVICE_KIND_OPTIONS.find((row) => row.value === kind)?.label || kind;
}
