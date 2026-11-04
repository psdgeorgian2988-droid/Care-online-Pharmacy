import { rxDoseCode } from "./rxTextParse.js";

export const DIGITAL_RX_DISCLAIMER =
  "The AI-generated transcription is not a substitute for the original prescription or a doctor's authenticated e-prescription.";

const NOT_ON_RX = "Not on prescription";

function text(value) {
  return String(value || "").trim();
}

function show(value) {
  return text(value) || NOT_ON_RX;
}

export function chartFrequency(med = {}) {
  const blob = [med.timing, med.frequency, med.instructions, med.doseCode]
    .filter(Boolean)
    .join(" ");
  const grid = blob.match(/\b\d(?:\s*-\s*\d){2,3}\b/);
  if (grid) return grid[0].replace(/\s/g, "");
  const code = rxDoseCode(med);
  if (code) return code;
  return text(med.timesPerDay || med.frequency);
}

export function foodTimingText(med = {}) {
  const blob = [med.timing, med.instructions, med.frequency].filter(Boolean).join(" ");
  if (/before food|empty stomach|\bac\b/i.test(blob)) return "Before food";
  if (/after food|\bpc\b/i.test(blob)) return "After food";
  if (/with food/i.test(blob)) return "With food";
  return "";
}

export function doseText(med = {}) {
  const qty = text(med.quantity);
  if (qty && !/^\d+$/.test(qty)) return qty;
  const form = text(med.form).toLowerCase();
  const count = /^\d+$/.test(qty) ? qty : "1";
  if (/tab/.test(form)) return `${count} tab`;
  if (/cap/.test(form)) return `${count} cap`;
  if (/syrup|susp/.test(form)) return qty ? `${qty} ${form}` : form;
  if (form) return qty ? `${qty} ${form}` : form;
  return qty;
}

function durationText(med = {}) {
  return text(med.durationDays || med.duration) || "Not specified";
}

function uncertain(med = {}) {
  return med.verified === false && !med.userCorrected && !med.partnerCorrected;
}

function prescriptionDisplayId(source = {}, extras = {}) {
  if (text(source.prescriptionId)) return text(source.prescriptionId);
  const yearMatch = text(extras.today || source.date).match(/(\d{4})/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
  const seed = text(source.accountRecordId || source.sourceSavedAt || extras.id || source.patientName);
  let n = 0;
  const raw = seed || "rx";
  for (let i = 0; i < raw.length; i += 1) n = (n * 33 + raw.charCodeAt(i)) % 100000;
  return `MH-RX-${year}-${String(n).padStart(5, "0")}`;
}

function ageGender(source = {}) {
  const age = text(source.patientAge || source.age);
  const gender = text(source.patientGender || source.gender);
  if (age && gender) return `${age} / ${gender}`;
  return age || gender;
}

export function buildDigitalPrescription(source = {}, extras = {}) {
  const medicines = (Array.isArray(source.medicines) ? source.medicines : []).map((med) => ({
    id: med.id || "",
    name: text(med.name) || "Medicine",
    strength: text(med.strength),
    dose: doseText(med),
    frequency: chartFrequency(med),
    duration: durationText(med),
    foodTiming: foodTimingText(med),
    salt: text(med.salt),
    instructions: text(med.instructions),
    uncertain: uncertain(med),
    verified: med.verified !== false || Boolean(med.userCorrected || med.partnerCorrected),
    userCorrected: Boolean(med.userCorrected),
    partnerCorrected: Boolean(med.partnerCorrected),
  }));
  const investigations = (Array.isArray(source.tests) ? source.tests : [])
    .map((test) => ({
      name: text(test.name),
      notes: text(test.notes),
      uncertain: test.verified === false,
    }))
    .filter((test) => test.name);
  const foodLines = [...new Set(medicines.map((med) => med.foodTiming).filter(Boolean))];
  const special = [text(source.notes), ...medicines.map((med) => med.instructions).filter(Boolean)]
    .filter((line, index, all) => line && all.indexOf(line) === index)
    .join(" ");
  const confirmed = Boolean(source.medicinesConfirmed);
  const hasRead = medicines.length > 0 || investigations.length > 0;
  return {
    format: "medihome-digital-prescription-v1",
    title: "DIGITAL PRESCRIPTION",
    status: confirmed
      ? "Customer confirmed names — pharmacist verification pending"
      : "AI extracted – pending verification",
    prescriptionId: prescriptionDisplayId(source, extras),
    patient: {
      name: text(source.patientName || extras.patientName),
      patientId: text(extras.patientId),
      ageGender: ageGender(source),
      mobile: text(extras.mobile || source.patientMobile || source.mobile),
      prescriptionDate: text(source.date),
    },
    doctor: {
      name: text(source.doctorName),
      qualification: text(source.doctorQualification || source.qualification),
      registrationNo: text(source.registrationNo || source.registrationNumber),
      hospital: text(source.clinicName || source.hospital),
    },
    diagnosis: {
      primary: text(source.primaryDiagnosis),
      secondary: text(source.secondaryDiagnosis),
      notes: text(source.clinicalNotes),
    },
    medicines,
    investigations,
    instructions: {
      foodTiming: foodLines.join("; "),
      special,
      followUpDate: text(source.followUpDate),
    },
    verification: {
      originalPrescription: extras.originalAttached ? "Attached" : "Not attached",
      aiExtraction: hasRead ? "Completed" : "Pending",
      pharmacistVerification: "Pending",
      doctorAuthentication: "Original signature / e-signature",
    },
    disclaimer: DIGITAL_RX_DISCLAIMER,
  };
}

export { NOT_ON_RX, show };
