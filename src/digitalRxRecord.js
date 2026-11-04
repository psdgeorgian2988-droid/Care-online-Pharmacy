import { readUserProfile } from "./addressFields.js";
import { readLoginSession } from "./authSession.js";
import {
  buildCustomerMedicalRecord,
  loadMedicalRecords,
  saveMedicalRecords,
} from "./medicalRecord.js";
import { isoDateToday } from "./personFields.js";
import { householdReportPeople } from "./reportPeople.js";
import { buildDigitalRx } from "./rxPartnerShare.js";
import { buildDigitalPrescription, show } from "./digitalRxFormat.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rxDateToIso(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  let year = match[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

function digitalRecordId(parsed = {}, draft = {}) {
  if (parsed.accountRecordId) return String(parsed.accountRecordId);
  const stamp = String(draft.savedAt || parsed.sourceSavedAt || Date.now()).replace(/\W/g, "");
  return `MH-RX-DIGITAL-${stamp.slice(-18) || Date.now()}`;
}

function fieldRow(label, value) {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(show(value))}</td></tr>`;
}

export function digitalPrescriptionHtml(record = {}) {
  const digital = record.digital && typeof record.digital === "object" ? record.digital : record;
  const doc =
    digital.document && typeof digital.document === "object"
      ? digital.document
      : buildDigitalPrescription(digital, {
          patientName: record.patientName || record.memberName || "",
          mobile: record.mobile || "",
          patientId: record.memberId || "",
          originalAttached: Boolean(record.fileName || record.fileData),
        });
  const medRows = (doc.medicines || [])
    .map((med) => {
      const flag = med.uncertain
        ? `<br><em class="warn">Unclear — confirm before ordering</em>`
        : "";
      return `<tr>
<td><strong>${escapeHtml(med.name)}</strong>${flag}</td>
<td>${escapeHtml(show(med.strength))}</td>
<td>${escapeHtml(show(med.dose))}</td>
<td>${escapeHtml(show(med.frequency))}</td>
<td>${escapeHtml(med.duration || "Not specified")}</td>
</tr>`;
    })
    .join("");
  const tests = (doc.investigations || [])
    .map((test) => `<li>${escapeHtml(test.name)}</li>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Digital Prescription</title>
<style>
body{font-family:Georgia,serif;margin:28px;color:#143246;background:#fff}
.card{border:1px solid #d7e8ec;border-radius:12px;padding:22px;max-width:760px}
.kicker{margin:0 0 8px;color:#1a6b7a;font-size:12px;font-weight:700;letter-spacing:.4px}
h1{margin:0 0 4px;font-size:22px}
.status{margin:0 0 14px;font-size:13px;font-weight:700;color:#1a6b7a}
p{margin:0 0 8px;font-size:14px;line-height:1.45}
h2{margin:16px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{border:1px solid #d7e8ec;padding:6px 8px;text-align:left;vertical-align:top}
th{width:38%;background:#f7fbfd;font-weight:700}
.meds th{width:auto;background:#f7fbfd}
ul{margin:8px 0 0;padding-left:18px}
.warn{color:#8a5a12;font-style:normal;font-size:12px}
.note{margin-top:14px;font-size:12px;color:#34546b}
</style></head><body>
<div class="card">
<p class="kicker">MediHome</p>
<h1>${escapeHtml(doc.title)}</h1>
<p class="status">${escapeHtml(doc.status)}</p>
<p><strong>Prescription ID:</strong> ${escapeHtml(doc.prescriptionId)}</p>
<h2>A. Patient information</h2>
<table>
${fieldRow("Patient name", doc.patient.name)}
${fieldRow("Patient ID", doc.patient.patientId)}
${fieldRow("Age / Gender", doc.patient.ageGender)}
${fieldRow("Mobile number", doc.patient.mobile)}
${fieldRow("Prescription date", doc.patient.prescriptionDate)}
</table>
<h2>B. Doctor information</h2>
<table>
${fieldRow("Doctor name", doc.doctor.name)}
${fieldRow("Qualification", doc.doctor.qualification)}
${fieldRow("Registration no.", doc.doctor.registrationNo)}
${fieldRow("Hospital / Clinic", doc.doctor.hospital)}
</table>
<h2>C. Diagnosis</h2>
<table>
${fieldRow("Primary diagnosis", doc.diagnosis.primary)}
${fieldRow("Secondary diagnosis", doc.diagnosis.secondary)}
${fieldRow("Relevant clinical notes", doc.diagnosis.notes)}
</table>
<h2>D. Medicines prescribed</h2>
${
  medRows
    ? `<table class="meds"><thead><tr><th>Medicine</th><th>Strength</th><th>Dose</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${medRows}</tbody></table>`
    : "<p>No medicines on this digital prescription.</p>"
}
<h2>E. Laboratory investigations</h2>
${tests ? `<ul>${tests}</ul>` : "<p>Not on prescription</p>"}
<h2>F. Additional instructions</h2>
<table>
${fieldRow("Before / after food", doc.instructions.foodTiming)}
${fieldRow("Special instructions", doc.instructions.special)}
${fieldRow("Follow-up date", doc.instructions.followUpDate)}
</table>
<h2>G. Verification</h2>
<table>
${fieldRow("Original prescription", doc.verification.originalPrescription)}
${fieldRow("AI extraction", doc.verification.aiExtraction)}
${fieldRow("Pharmacist verification", doc.verification.pharmacistVerification)}
${fieldRow("Doctor authentication", doc.verification.doctorAuthentication)}
</table>
<p class="note">${escapeHtml(doc.disclaimer)}</p>
</div>
</body></html>`;
}

export function digitalPrescriptionDataUrl(record = {}) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(digitalPrescriptionHtml(record))}`;
}

export function saveConfirmedDigitalRx(parsed, draft = {}, extras = {}) {
  if (!parsed?.medicinesConfirmed) return null;
  const profile = extras.profile || readUserProfile();
  const session = extras.session || readLoginSession();
  const people = extras.people || householdReportPeople(profile, session);
  const person = extras.person || people[0] || null;
  const id = digitalRecordId(parsed, draft);
  const digital = buildDigitalRx(parsed, {
    mobile: profile?.mobile || person?.mobile || "",
    patientId: person?.id || "",
    patientName: person?.name || "",
    originalAttached: Boolean(draft?.fileData || draft?.fileName),
    today: extras.today || "",
    id,
  });
  if (!digital?.medicines?.length) return null;
  const date = rxDateToIso(digital.date) || extras.today || isoDateToday();
  const payload = {
    ...digital,
    patientName: digital.patientName || person?.name || "",
    date: digital.date || date,
  };
  payload.document = buildDigitalPrescription(payload, {
    mobile: profile?.mobile || person?.mobile || "",
    patientId: person?.id || "",
    patientName: payload.patientName,
    originalAttached: Boolean(draft?.fileData || draft?.fileName),
    today: date,
    id,
  });
  const record = {
    ...buildCustomerMedicalRecord(
      "prescription",
      {
        date,
        clinicName: digital.doctorName || "Digital Rx",
        notes: digital.notes || "",
        fileName: "Digital-Rx.html",
        fileType: "text/html",
        fileData: digitalPrescriptionDataUrl({ ...payload, digital: payload }),
      },
      { id, person, people, now: extras.now }
    ),
    testName: "Digital Rx",
    name: digital.doctorName ? `Digital Rx · ${digital.doctorName}` : "Digital Rx",
    digital: payload,
    source: "digital-rx",
    sourceSavedAt: draft.savedAt || parsed.sourceSavedAt || "",
    medicinesConfirmed: true,
  };
  const list = loadMedicalRecords(extras.storage);
  const next = [
    record,
    ...list.filter((row) => {
      if (row?.id === id) return false;
      if (row?.source === "digital-rx" && record.sourceSavedAt && row.sourceSavedAt === record.sourceSavedAt) {
        return false;
      }
      return true;
    }),
  ];
  saveMedicalRecords(next, extras.storage);
  return record;
}
