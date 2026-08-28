const CUSTOM_TESTS_KEY = "mediHomeCustomReportTests";
export const ADD_UNLISTED_TEST = "__add_unlisted__";

/** Same bookable names as LabTests.jsx (LABS + RADIOLOGY_PARTNERS), unique. */
export const LABORATORY_TESTS = [
  "Complete Blood Count (CBC)",
  "HbA1c - Diabetes Test",
  "Lipid Profile",
  "Liver Function Test (LFT)",
  "Kidney Function Test (KFT)",
  "Thyroid Profile",
  "Vitamin D Test",
  "Fasting Blood Sugar",
  "Insulin (Fasting)",
  "Complete Urine Examination",
  "Urine Culture",
  "Urine Pregnancy Test",
  "Stool Routine Examination",
  "Stool Occult Blood",
];

export const RADIOLOGY_TESTS = [
  "MRI Brain",
  "CT Scan Chest",
  "Ultrasound Abdomen",
  "X-Ray Chest",
  "Doppler Lower Limb",
  "Mammography",
];

/** Extra names used to correct spelling when a customer adds an unlisted test. */
const SPELLING_CATALOG = [
  ...LABORATORY_TESTS,
  ...RADIOLOGY_TESTS,
  "Vitamin B12 Test",
  "Iron Studies",
  "Serum Ferritin",
  "C-Reactive Protein (CRP)",
  "Erythrocyte Sedimentation Rate (ESR)",
  "Prostate Specific Antigen (PSA)",
  "HIV Test",
  "Dengue NS1",
  "COVID RT-PCR",
  "ECG",
  "2D Echo",
  "Treadmill Test (TMT)",
  "EEG",
  "Pulmonary Function Test (PFT)",
  "Blood Grouping",
  "Uric Acid",
  "Serum Calcium",
  "Prothrombin Time (PT/INR)",
  "D-Dimer",
  "Troponin I",
  "Pap Smear",
  "MRI Spine",
  "MRI Knee",
  "CT Head",
  "CT Abdomen",
  "Ultrasound Pelvis",
  "X-Ray Knee",
  "X-Ray Spine",
];

const ALIASES = {
  cbc: "Complete Blood Count (CBC)",
  haemogram: "Complete Blood Count (CBC)",
  hemogram: "Complete Blood Count (CBC)",
  hba1c: "HbA1c - Diabetes Test",
  "hb a1c": "HbA1c - Diabetes Test",
  "glycated hemoglobin": "HbA1c - Diabetes Test",
  lipid: "Lipid Profile",
  cholesterol: "Lipid Profile",
  cholestrol: "Lipid Profile",
  lft: "Liver Function Test (LFT)",
  "liver function": "Liver Function Test (LFT)",
  kft: "Kidney Function Test (KFT)",
  rft: "Kidney Function Test (KFT)",
  "kidney function": "Kidney Function Test (KFT)",
  "renal function": "Kidney Function Test (KFT)",
  thyroid: "Thyroid Profile",
  tsh: "Thyroid Profile",
  "vit d": "Vitamin D Test",
  "vitamin d": "Vitamin D Test",
  "vitamin d3": "Vitamin D Test",
  fbs: "Fasting Blood Sugar",
  "fasting sugar": "Fasting Blood Sugar",
  "fasting glucose": "Fasting Blood Sugar",
  "urine routine": "Complete Urine Examination",
  cue: "Complete Urine Examination",
  "pregnancy test": "Urine Pregnancy Test",
  "stool routine": "Stool Routine Examination",
  "occult blood": "Stool Occult Blood",
  "mri brain": "MRI Brain",
  "mri head": "MRI Brain",
  "ct chest": "CT Scan Chest",
  "ct thorax": "CT Scan Chest",
  "usg abdomen": "Ultrasound Abdomen",
  "ultrasound tummy": "Ultrasound Abdomen",
  "xray chest": "X-Ray Chest",
  "x ray chest": "X-Ray Chest",
  cxr: "X-Ray Chest",
  mammo: "Mammography",
  mamography: "Mammography",
  "vit b12": "Vitamin B12 Test",
  "vitamin b12": "Vitamin B12 Test",
  crp: "C-Reactive Protein (CRP)",
  esr: "Erythrocyte Sedimentation Rate (ESR)",
  psa: "Prostate Specific Antigen (PSA)",
  echo: "2D Echo",
  "2d echo": "2D Echo",
  tmt: "Treadmill Test (TMT)",
  pft: "Pulmonary Function Test (PFT)",
};

const TOKEN_FIX = {
  diabtes: "diabetes",
  diabatis: "diabetes",
  diabitic: "diabetic",
  throid: "thyroid",
  thyriod: "thyroid",
  kideny: "kidney",
  kidny: "kidney",
  livar: "liver",
  cholestrol: "cholesterol",
  pregnency: "pregnancy",
  ultasound: "ultrasound",
  ultasnd: "ultrasound",
  mamography: "mammography",
  protien: "protein",
  haemoglobin: "hemoglobin",
  haemogram: "hemogram",
  funtion: "function",
  fuction: "function",
  examintion: "examination",
};

const KEEP_CASE = new Set([
  "cbc",
  "hba1c",
  "lft",
  "kft",
  "rft",
  "mri",
  "ct",
  "tsh",
  "psa",
  "crp",
  "esr",
  "hiv",
  "usg",
  "ecg",
  "eeg",
  "pft",
  "tmt",
  "ana",
  "bnp",
  "fnac",
  "ns1",
  "pt",
  "inr",
  "igm",
  "igg",
  "ige",
  "dna",
  "rna",
  "2d",
]);

function fold(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const s = fold(a);
  const t = fold(b);
  const rows = s.length + 1;
  const cols = t.length + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(
        grid[i - 1][j] + 1,
        grid[i][j - 1] + 1,
        grid[i - 1][j - 1] + cost
      );
    }
  }
  return grid[s.length][t.length];
}

function fixTokens(raw) {
  return String(raw || "")
    .trim()
    .split(/\s+/)
    .map((part) => TOKEN_FIX[part.toLowerCase()] || part)
    .join(" ");
}

function titleCaseTest(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const key = part.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (KEEP_CASE.has(key)) return part.toUpperCase();
      if (key === "hba1c") return "HbA1c";
      if (key === "xray" || part.toLowerCase() === "x-ray") return "X-Ray";
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function matchKnown(raw, extra = []) {
  const query = fold(raw);
  if (!query) return "";
  if (ALIASES[query]) return ALIASES[query];
  const aliasHit = Object.entries(ALIASES).find(([alias]) => {
    if (query === alias) return true;
    if (query.includes(alias) && alias.length >= 4) return true;
    return alias.includes(query) && query.length >= 4;
  });
  if (aliasHit) return aliasHit[1];
  const catalog = [...SPELLING_CATALOG, ...extra];
  const exact = catalog.find((name) => fold(name) === query);
  if (exact) return exact;
  let best = "";
  let bestScore = Infinity;
  for (const name of catalog) {
    const score = levenshtein(query, name);
    const limit = Math.max(2, Math.ceil(Math.min(query.length, fold(name).length) * 0.28));
    if (score <= limit && score < bestScore) {
      best = name;
      bestScore = score;
    }
  }
  return best;
}

export function listedTestNames(customTests = []) {
  const seen = new Set();
  const names = [];
  for (const name of [...LABORATORY_TESTS, ...RADIOLOGY_TESTS, ...customTests]) {
    const label = String(name || "").trim();
    if (!label || seen.has(fold(label))) continue;
    seen.add(fold(label));
    names.push(label);
  }
  return names;
}

export function correctTestSpelling(raw, customTests = []) {
  const typed = fixTokens(String(raw || "").trim());
  if (!typed) {
    return { ok: false, error: "Enter the test name." };
  }
  const known = matchKnown(typed, customTests);
  if (known) {
    return {
      ok: true,
      name: known,
      corrected: fold(known) !== fold(typed),
      matchedExisting: true,
    };
  }
  const formatted = titleCaseTest(typed);
  return {
    ok: true,
    name: formatted,
    corrected: formatted !== typed,
    matchedExisting: false,
  };
}

export function loadCustomReportTests() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TESTS_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.map((row) => String(row || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function saveCustomReportTest(name, existing = loadCustomReportTests()) {
  const label = String(name || "").trim();
  if (!label) return existing;
  const next = listedTestNames([...existing, label]).filter(
    (row) =>
      !LABORATORY_TESTS.includes(row) && !RADIOLOGY_TESTS.includes(row)
  );
  try {
    localStorage.setItem(CUSTOM_TESTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}
