/** What a doctor sees on a booked appointment, and the symptom list for a prescription. */

export const DOCTOR_SYMPTOMS = [
  "Fever",
  "Running nose",
  "Cough",
  "Sore throat",
  "Headache",
  "Body ache",
  "Cold",
  "Vomiting",
  "Loose motions",
  "Stomach pain",
  "Chest pain",
  "Breathlessness",
  "Weakness",
  "Skin rash",
  "Allergy",
  "Back pain",
  "Joint pain",
  "Burning urination",
  "Dizziness",
  "Loss of appetite",
];

export function patientMobile(order = {}) {
  return String(order.mobile || order.patientMobile || order.phone || "")
    .replace(/\D/g, "")
    .slice(-10);
}

export function doctorKnowsMobile(jobs = [], mobile = "") {
  const wanted = String(mobile || "").replace(/\D/g, "").slice(-10);
  if (wanted.length !== 10) return false;
  return (Array.isArray(jobs) ? jobs : []).some((row) => patientMobile(row) === wanted);
}

function visitAddress(order = {}) {
  const line = String(order.address || order.deliveryAddress || order.pickupAddress || "").trim();
  const pin = String(order.pinCode || order.pin || "").replace(/\D/g, "").slice(0, 6);
  if (line && pin && !line.includes(pin)) return `${line}, ${pin}`;
  return line || pin || "Not provided";
}

export function doctorVisitSummary(order = {}) {
  const name = String(order.patientName || order.name || "").trim() || "Patient";
  const mobile = patientMobile(order) || "Not provided";
  const time = [order.date, order.timeSlot || order.requestedTimeSlot].filter(Boolean).join(" · ");
  const reason = String(order.concern || "").trim() || "Not provided";
  return {
    name,
    mobile,
    address: visitAddress(order),
    time: time || "Not provided",
    reason,
  };
}

export function visitsForPatient(jobs = [], order = {}) {
  const mobile = patientMobile(order);
  if (mobile.length !== 10) return order ? [order] : [];
  return (Array.isArray(jobs) ? jobs : [])
    .filter((row) => patientMobile(row) === mobile)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function cleanSymptom(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 40);
}

export function doctorPrescriptionFrom(body = {}, now = Date.now()) {
  const seen = new Set();
  const symptoms = [];
  for (const row of Array.isArray(body.symptoms) ? body.symptoms : []) {
    const symptom = cleanSymptom(row);
    const key = symptom.toLowerCase();
    if (symptom.length < 2 || seen.has(key)) continue;
    seen.add(key);
    symptoms.push(symptom);
    if (symptoms.length >= 12) break;
  }
  if (!symptoms.length) return { ok: false, error: "Add at least one symptom." };
  return {
    ok: true,
    prescription: {
      symptoms,
      note: String(body.note || "").replace(/\s+/g, " ").trim().slice(0, 800),
      savedAt: Number(now) || Date.now(),
    },
  };
}
