export const MEDIHOME_BILLING = {
  id: "MH-GST",
  name: "MediHome Healthcare Private Limited",
  tradeName: "MediHome",
  area: "Connaught Place, New Delhi",
  address: "MediHome, Connaught Place, New Delhi 110001",
  phone: "7292094000",
  gstin: "07AAMCM2608Q1Z3",
  pan: "AAMCM2608Q",
  dlNo: "",
  licenseLabel: "",
};

export const DIAGNOSTIC_LABS = [
  {
    id: "metropolis",
    name: "Metropolis",
    area: "South Delhi",
    address: "Green Park, New Delhi 110016",
    gstin: "07AABCM3847M1Z1",
    dlNo: "DMC/LAB/2018/1142",
    licenseLabel: "Lab Licence No.",
    tests: [
      { id: "cbc", name: "Complete Blood Count (CBC)", price: 499 },
      { id: "hba1c", name: "HbA1c - Diabetes Test", price: 599 },
      { id: "lipid", name: "Lipid Profile", price: 699 },
      { id: "lft", name: "Liver Function Test (LFT)", price: 799 },
      { id: "kft", name: "Kidney Function Test (KFT)", price: 799 },
      { id: "fbs", name: "Fasting Blood Sugar", price: 199 },
      { id: "stool-occult", name: "Stool Occult Blood", price: 349 },
    ],
  },
  {
    id: "max-healthcare",
    name: "Max Healthcare",
    area: "Saket",
    address: "Saket, New Delhi 110017",
    gstin: "07AAACM2293H1Z8",
    dlNo: "DMC/LAB/2016/0881",
    licenseLabel: "Lab Licence No.",
    tests: [
      { id: "cbc", name: "Complete Blood Count (CBC)", price: 449 },
      { id: "hba1c", name: "HbA1c - Diabetes Test", price: 549 },
      { id: "thyroid", name: "Thyroid Profile", price: 699 },
      { id: "vitd", name: "Vitamin D Test", price: 799 },
      { id: "lipid", name: "Lipid Profile", price: 649 },
      { id: "insulin", name: "Insulin (Fasting)", price: 899 },
      { id: "urine-pregnancy", name: "Urine Pregnancy Test", price: 249 },
    ],
  },
  {
    id: "lal-pathlabs",
    name: "Lal PathLabs",
    area: "Rohini",
    address: "Rohini, New Delhi 110085",
    gstin: "07AAACL0582L1Z2",
    dlNo: "DMC/LAB/2014/0520",
    licenseLabel: "Lab Licence No.",
    tests: [
      { id: "cbc", name: "Complete Blood Count (CBC)", price: 399 },
      { id: "hba1c", name: "HbA1c - Diabetes Test", price: 499 },
      { id: "lipid", name: "Lipid Profile", price: 599 },
      { id: "thyroid", name: "Thyroid Profile", price: 649 },
      { id: "urine", name: "Complete Urine Examination", price: 299 },
      { id: "urine-culture", name: "Urine Culture", price: 549 },
      { id: "stool-routine", name: "Stool Routine Examination", price: 299 },
    ],
  },
  {
    id: "agilus",
    name: "Agilus Diagnostics",
    area: "Okhla",
    address: "Okhla, New Delhi 110020",
    gstin: "07AAACA4471A1Z6",
    dlNo: "DMC/LAB/2020/2019",
    licenseLabel: "Lab Licence No.",
    tests: [
      { id: "cbc", name: "Complete Blood Count (CBC)", price: 429 },
      { id: "hba1c", name: "HbA1c - Diabetes Test", price: 529 },
      { id: "lipid", name: "Lipid Profile", price: 629 },
      { id: "lft", name: "Liver Function Test (LFT)", price: 749 },
      { id: "vitd", name: "Vitamin D Test", price: 749 },
      { id: "stool-occult", name: "Stool Occult Blood", price: 329 },
    ],
  },
];

export const IMAGING_CENTRES = [
  {
    id: "rad1",
    name: "MediHome Imaging Centre - Gurgaon",
    area: "Sector 29, Gurugram",
    address: "Sector 29, Gurugram 122001",
    gstin: "06AAMHM1220G1Z4",
    dlNo: "AERB/RSD/HR-0291",
    licenseLabel: "AERB / Centre Licence No.",
    tests: [
      { id: "mri-brain", name: "MRI Brain", price: 3500 },
      { id: "ct-chest", name: "CT Scan Chest", price: 2500 },
      { id: "usg-abdomen", name: "Ultrasound Abdomen", price: 900 },
      { id: "xray-chest", name: "X-Ray Chest", price: 450 },
      { id: "doppler-leg", name: "Doppler Lower Limb", price: 1800 },
    ],
  },
  {
    id: "rad2",
    name: "MediHome Imaging Centre - Noida",
    area: "Sector 18, Noida",
    address: "Sector 18, Noida 201301",
    gstin: "09AAMHM2013N1Z1",
    dlNo: "AERB/RSD/UP-0188",
    licenseLabel: "AERB / Centre Licence No.",
    tests: [
      { id: "mri-brain", name: "MRI Brain", price: 3200 },
      { id: "ct-chest", name: "CT Scan Chest", price: 2300 },
      { id: "usg-abdomen", name: "Ultrasound Abdomen", price: 850 },
      { id: "xray-chest", name: "X-Ray Chest", price: 400 },
      { id: "mammography", name: "Mammography", price: 1400 },
    ],
  },
  {
    id: "rad3",
    name: "MediHome Imaging Centre - Delhi",
    area: "Green Park",
    address: "Green Park, New Delhi 110016",
    gstin: "07AAMHM1100D1Z8",
    dlNo: "AERB/RSD/DL-0440",
    licenseLabel: "AERB / Centre Licence No.",
    tests: [
      { id: "mri-brain", name: "MRI Brain", price: 3000 },
      { id: "ct-chest", name: "CT Scan Chest", price: 2200 },
      { id: "usg-abdomen", name: "Ultrasound Abdomen", price: 800 },
      { id: "xray-chest", name: "X-Ray Chest", price: 350 },
      { id: "mammography", name: "Mammography", price: 1300 },
    ],
  },
];

function matchParty(list, id, name) {
  const wantedId = String(id || "").trim().toLowerCase();
  const wantedName = String(name || "").trim().toLowerCase();
  return (
    list.find((row) => row.id.toLowerCase() === wantedId) ||
    list.find((row) => row.name.toLowerCase() === wantedName) ||
    null
  );
}

export function findDiagnosticParty(kind, { id, name } = {}) {
  if (kind === "radiology") return matchParty(IMAGING_CENTRES, id, name);
  return matchParty(DIAGNOSTIC_LABS, id, name);
}
