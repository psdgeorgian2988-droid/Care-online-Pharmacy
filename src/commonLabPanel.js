import { DIAGNOSTIC_LABS, IMAGING_CENTRES } from "./diagnosticPartners.js";

/** Common OPD tests. Price is the Metropolis-level MRP; each lab is scaled from its CBC. */
export const COMMON_LAB_TESTS = [
  { id: "cbc", name: "Complete Blood Count (CBC)", price: 499 },
  { id: "esr", name: "ESR", price: 149 },
  { id: "crp", name: "C-Reactive Protein (CRP)", price: 449 },
  { id: "fbs", name: "Fasting Blood Sugar", price: 199, prep: "fasting" },
  { id: "ppbs", name: "Post Prandial Blood Sugar", price: 199 },
  { id: "hba1c", name: "HbA1c - Diabetes Test", price: 599 },
  { id: "lipid", name: "Lipid Profile", price: 699, prep: "fasting" },
  { id: "lft", name: "Liver Function Test (LFT)", price: 799, prep: "fasting" },
  { id: "kft", name: "Kidney Function Test (KFT)", price: 799 },
  { id: "electrolytes", name: "Serum Electrolytes", price: 499 },
  { id: "uric", name: "Uric Acid", price: 249 },
  { id: "calcium", name: "Serum Calcium", price: 299 },
  { id: "thyroid", name: "Thyroid Profile", price: 699 },
  { id: "tsh", name: "TSH", price: 349 },
  { id: "vitd", name: "Vitamin D Test", price: 799 },
  { id: "vitb12", name: "Vitamin B12", price: 699 },
  { id: "iron", name: "Serum Iron Studies", price: 899 },
  { id: "ferritin", name: "Ferritin", price: 799 },
  { id: "urine", name: "Complete Urine Examination", price: 299, prep: "urine" },
  { id: "urine-culture", name: "Urine Culture", price: 549, prep: "urine" },
  { id: "urine-pregnancy", name: "Urine Pregnancy Test", price: 249, prep: "urine" },
  { id: "stool-routine", name: "Stool Routine Examination", price: 299, prep: "stool" },
  { id: "stool-occult", name: "Stool Occult Blood", price: 349, prep: "stool" },
  { id: "dengue", name: "Dengue NS1 Antigen", price: 699 },
  { id: "malaria", name: "Malaria Antigen", price: 499 },
  { id: "typhidot", name: "Typhidot IgM", price: 599 },
  { id: "widal", name: "Widal Test", price: 299 },
  { id: "hiv", name: "HIV Screening", price: 449 },
  { id: "hbsag", name: "HBsAg", price: 349 },
  { id: "hcv", name: "Anti-HCV", price: 549 },
  { id: "psa", name: "PSA Total", price: 799 },
  { id: "pt-inr", name: "PT / INR", price: 399 },
  { id: "aptt", name: "APTT", price: 399 },
  { id: "blood-group", name: "Blood Group and Rh", price: 149 },
];

export const COMMON_IMAGING = [
  { id: "xray-chest", name: "X-Ray Chest", price: 450 },
  { id: "xray-spine", name: "X-Ray Spine", price: 550 },
  { id: "usg-abdomen", name: "Ultrasound Abdomen", price: 900 },
  { id: "usg-pelvis", name: "Ultrasound Pelvis", price: 900 },
  { id: "ct-chest", name: "CT Scan Chest", price: 2500 },
  { id: "ct-head", name: "CT Head", price: 2200 },
  { id: "mri-brain", name: "MRI Brain", price: 3500 },
  { id: "mri-spine", name: "MRI Spine", price: 4500 },
  { id: "doppler-leg", name: "Doppler Lower Limb", price: 1800 },
  { id: "mammography", name: "Mammography", price: 1300 },
];

function fold(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function scalePrice(base, ratio) {
  const price = Math.round((Number(base) * ratio) / 10) * 10;
  return Math.max(99, price || Number(base) || 99);
}

function ratioFrom(tests, anchorId, anchorBase) {
  const hit = (tests || []).find((row) => row.id === anchorId);
  const price = Number(hit?.price);
  if (!Number.isFinite(price) || price <= 0) return 1;
  return price / anchorBase;
}

function mergePanel(partners, panel, anchorId, anchorBase) {
  return (partners || []).map((partner) => {
    const tests = [...(partner.tests || [])];
    const seen = new Set(tests.map((row) => fold(row.id || row.name)));
    const ratio = ratioFrom(tests, anchorId, anchorBase);
    for (const row of panel) {
      const idKey = fold(row.id);
      const nameKey = fold(row.name);
      if (seen.has(idKey) || seen.has(nameKey)) continue;
      seen.add(idKey);
      seen.add(nameKey);
      tests.push({
        id: row.id,
        name: row.name,
        price: scalePrice(row.price, ratio),
        prep: row.prep || "",
      });
    }
    return { ...partner, tests };
  });
}

export function withCommonLabPanel(labs = DIAGNOSTIC_LABS) {
  return mergePanel(labs, COMMON_LAB_TESTS, "cbc", 499);
}

export function withCommonImagingPanel(centres = IMAGING_CENTRES) {
  return mergePanel(centres, COMMON_IMAGING, "usg-abdomen", 900);
}

export function catalogLabIdForPartner(partner = {}) {
  const explicit = String(partner.catalogLabId || partner.labCatalogId || "").trim();
  if (explicit) return explicit;
  const name = fold(partner.name);
  if (!name) return "others";
  const hit = DIAGNOSTIC_LABS.find((lab) => {
    const labName = fold(lab.name);
    return labName && (name.includes(labName) || labName.includes(name));
  });
  return hit?.id || "others";
}
