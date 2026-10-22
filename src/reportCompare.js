import { RADIOLOGY_TESTS } from "./healthTestNames.js";
import { inferDiagnosticKind, medicalRecordKind } from "./medicalRecord.js";

/** Standard numeric rows for lab panels. Imaging reports are not listed. */
export const REPORT_PANELS = {
  "Complete Blood Count (CBC)": [
    ["Haemoglobin", "g/dL"],
    ["RBC", "million/µL"],
    ["WBC", "/µL"],
    ["Platelets", "/µL"],
    ["Haematocrit", "%"],
    ["MCV", "fL"],
    ["MCH", "pg"],
    ["MCHC", "g/dL"],
    ["Neutrophils", "%"],
    ["Lymphocytes", "%"],
    ["Monocytes", "%"],
    ["Eosinophils", "%"],
    ["Basophils", "%"],
  ],
  "Liver Function Test (LFT)": [
    ["Bilirubin Total", "mg/dL"],
    ["Bilirubin Direct", "mg/dL"],
    ["SGOT / AST", "U/L"],
    ["SGPT / ALT", "U/L"],
    ["Alkaline Phosphatase", "U/L"],
    ["GGT", "U/L"],
    ["Total Protein", "g/dL"],
    ["Albumin", "g/dL"],
  ],
  "Kidney Function Test (KFT)": [
    ["Urea", "mg/dL"],
    ["Creatinine", "mg/dL"],
    ["Uric Acid", "mg/dL"],
    ["Sodium", "mmol/L"],
    ["Potassium", "mmol/L"],
  ],
  "Lipid Profile": [
    ["Total Cholesterol", "mg/dL"],
    ["HDL", "mg/dL"],
    ["LDL", "mg/dL"],
    ["Triglycerides", "mg/dL"],
    ["VLDL", "mg/dL"],
  ],
  "Thyroid Profile": [
    ["T3", "ng/dL"],
    ["T4", "µg/dL"],
    ["TSH", "µIU/mL"],
  ],
  "Thyroid Profile (T3, T4, TSH)": [
    ["T3", "ng/dL"],
    ["T4", "µg/dL"],
    ["TSH", "µIU/mL"],
  ],
  "HbA1c - Diabetes Test": [["HbA1c", "%"]],
  "Fasting Blood Sugar": [["Fasting Blood Sugar", "mg/dL"]],
  "Post Prandial Blood Sugar": [["Post Prandial Blood Sugar", "mg/dL"]],
  "Vitamin D Test": [["Vitamin D", "ng/mL"]],
  "Vitamin D (25-OH)": [["Vitamin D", "ng/mL"]],
  "Vitamin B12": [["Vitamin B12", "pg/mL"]],
  "C-Reactive Protein (CRP)": [["CRP", "mg/L"]],
  "Erythrocyte Sedimentation Rate (ESR)": [["ESR", "mm/hr"]],
};

export function isImagingReportName(testName = "") {
  const name = String(testName || "").trim();
  if (!name) return false;
  if (RADIOLOGY_TESTS.includes(name)) return true;
  return inferDiagnosticKind(name) === "radiology";
}

export function panelForReport(testName = "") {
  const rows = REPORT_PANELS[String(testName || "").trim()] || [];
  return rows.map(([name, unit]) => ({ name, unit, value: "" }));
}

/** First plain number in a lab cell. Thousands commas are ignored. */
export function parseReportNumber(raw) {
  const text = String(raw ?? "")
    .trim()
    .replace(/,/g, "");
  if (!text) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function cleanReportValues(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const value = parseReportNumber(row?.value ?? row?.raw);
      return {
        name: String(row?.name || "").trim(),
        unit: String(row?.unit || "").trim(),
        value,
      };
    })
    .filter((row) => row.name && row.value != null);
}

function reportStamp(record) {
  const date = String(record?.date || "");
  const saved = Date.parse(record?.savedAt || "");
  const tie = Number.isFinite(saved) ? String(saved).padStart(16, "0") : "0";
  return `${date}\u0000${tie}`;
}

/** Lab and imaging reports grouped by name. Newest file is first in each group. */
export function groupReportsByName(records) {
  const groups = new Map();
  for (const row of Array.isArray(records) ? records : []) {
    const kind = medicalRecordKind(row);
    if (kind !== "lab" && kind !== "radiology") continue;
    const name = String(row?.testName || row?.name || "").trim();
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  const list = [...groups.entries()].map(([name, items]) => {
    const reports = [...items].sort((a, b) => reportStamp(b).localeCompare(reportStamp(a)));
    return {
      name,
      kind: medicalRecordKind(reports[0]),
      reports,
    };
  });
  list.sort((a, b) => reportStamp(b.reports[0]).localeCompare(reportStamp(a.reports[0])));
  return list;
}

/**
 * Numeric rows from the newest report beside the previous report of the same name.
 * Imaging reports are returned empty so the file stays as uploaded.
 */
export function compareReportPair(current, previous) {
  if (!current || medicalRecordKind(current) === "radiology") return [];
  const earlier = new Map();
  for (const row of cleanReportValues(previous?.values)) {
    earlier.set(row.name.toLowerCase(), row);
  }
  return cleanReportValues(current.values).map((row) => {
    const prev = earlier.get(row.name.toLowerCase()) || null;
    return {
      name: row.name,
      unit: row.unit || prev?.unit || "",
      current: row.value,
      previous: prev ? prev.value : null,
    };
  });
}
