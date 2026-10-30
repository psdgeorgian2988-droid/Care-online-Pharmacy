/** Choices a doctor partner must pick, matching the specialties patients can book. */

export const DOCTOR_SPECIALTIES = [
  ["gp", "General Physician"],
  ["pediatrician", "Pediatrician"],
  ["gynecologist", "Gynecologist"],
  ["cardiologist", "Cardiologist"],
  ["orthopedic", "Orthopedic"],
  ["dermatologist", "Dermatologist"],
  ["ent", "ENT"],
  ["nephrologist", "Nephrologist"],
  ["neurologist", "Neurologist"],
  ["neurosurgeon", "Neurosurgeon"],
  ["gastroenterologist", "Gastroenterologist"],
  ["pulmonologist", "Pulmonologist"],
  ["endocrinologist", "Endocrinologist"],
  ["diabetologist", "Diabetologist"],
  ["urologist", "Urologist"],
  ["andrologist", "Andrologist"],
  ["oncologist", "Oncologist"],
  ["hematologist", "Hematologist"],
  ["rheumatologist", "Rheumatologist"],
  ["ophthalmologist", "Ophthalmologist"],
  ["dentist", "Dentist"],
  ["psychiatrist", "Psychiatrist"],
  ["general-surgeon", "General Surgeon"],
  ["plastic-surgeon", "Plastic Surgeon"],
  ["vascular-surgeon", "Vascular Surgeon"],
  ["hepatologist", "Hepatologist"],
  ["allergist", "Allergist / Immunologist"],
  ["infectious-disease", "Infectious Disease"],
  ["geriatrician", "Geriatrician"],
  ["pain-specialist", "Pain Specialist"],
  ["dietitian", "Dietitian"],
  ["sexologist", "Sexologist"],
  ["chest-physician", "Chest Physician"],
  ["internal-medicine", "Internal Medicine"],
].map(([value, label]) => ({ value, label }));

export const DOCTOR_QUALIFICATIONS = [
  "MBBS",
  "MD",
  "MS",
  "DNB",
  "DM",
  "MCh",
  "Diploma",
  "MBBS, MD",
  "MBBS, MS",
  "MBBS, DNB",
  "MBBS, DM",
  "MBBS, MCh",
  "BDS",
  "MDS",
  "BAMS",
  "BHMS",
  "BUMS",
  "BNYS",
  "BPT",
  "MPT",
  "Fellowship",
  "PhD",
];

export const DOCTOR_COUNCILS = [
  "National Medical Commission",
  "Delhi Medical Council",
  "Haryana Medical Council",
  "Uttar Pradesh Medical Council",
  "Rajasthan Medical Council",
  "Punjab Medical Council",
  "Maharashtra Medical Council",
  "Gujarat Medical Council",
  "Karnataka Medical Council",
  "Tamil Nadu Medical Council",
  "Kerala Medical Council",
  "Andhra Pradesh Medical Council",
  "Telangana State Medical Council",
  "West Bengal Medical Council",
  "Bihar Medical Council",
  "Madhya Pradesh Medical Council",
  "Dental Council of India",
  "Central Council of Indian Medicine",
  "National Commission for Homoeopathy",
];

export const DOCTOR_EXPERIENCE = [
  { value: "0", label: "Less than 1 year" },
  ...Array.from({ length: 39 }, (_, index) => {
    const years = index + 1;
    return { value: String(years), label: years === 1 ? "1 year" : `${years} years` };
  }),
  { value: "40+", label: "40+ years" },
];

export function specialtyLabel(value) {
  return DOCTOR_SPECIALTIES.find((row) => row.value === value)?.label || "";
}

export function experienceLabel(value) {
  return DOCTOR_EXPERIENCE.find((row) => row.value === String(value || ""))?.label || "";
}

export function doctorProfileMissing(draft = {}) {
  const profile = draft.profile || {};
  if (String(draft.role || "").trim().length < 2) return "Role is required.";
  if (!specialtyLabel(profile.specialty)) return "Select a specialty.";
  if (!DOCTOR_QUALIFICATIONS.includes(profile.qualification)) return "Select a qualification.";
  if (!experienceLabel(profile.experienceYears)) return "Select years of experience.";
  if (String(profile.registrationNumber || "").trim().length < 3) {
    return "Medical registration number is required.";
  }
  if (!DOCTOR_COUNCILS.includes(profile.registrationCouncil)) return "Select the registration council.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(profile.email || "").trim())) return "Email is required.";
  if (!/^\d{12}$/.test(String(profile.aadhaarNumber || ""))) return "A 12-digit Aadhaar number is required.";
  if (!profile.photoData) return "Upload a profile photo.";
  if (!profile.aadhaarFileData) return "Upload the Aadhaar card.";
  if (!profile.policeFileData) return "Upload police verification.";
  const certificates = Array.isArray(profile.certificates) ? profile.certificates : [];
  if (!certificates.some((row) => row?.fileData)) return "Upload at least one certificate.";
  return "";
}
