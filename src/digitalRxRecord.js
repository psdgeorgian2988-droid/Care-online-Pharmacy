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
import { rxDoseCode } from "./rxTextParse.js";

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

function durationLabel(med) {
  return String(med?.durationDays || med?.duration || "").trim() || "Not specified";
}

function digitalRecordId(parsed = {}, draft = {}) {
  if (parsed.accountRecordId) return String(parsed.accountRecordId);
  const stamp = String(draft.savedAt || parsed.sourceSavedAt || Date.now()).replace(/\W/g, "");
  return `MH-RX-DIGITAL-${stamp.slice(-18) || Date.now()}`;
}

export function digitalPrescriptionHtml(record = {}) {
  const digital = record.digital && typeof record.digital === "object" ? record.digital : record;
  const patient =
    String(digital.patientName || record.patientName || record.memberName || "").trim() ||
    "Patient";
  const doctor = String(digital.doctorName || record.doctorName || record.clinicName || "").trim();
  const date = String(digital.date || record.date || "").trim();
  const medicines = Array.isArray(digital.medicines) ? digital.medicines : [];
  const tests = Array.isArray(digital.tests) ? digital.tests : [];
  const medRows = medicines
    .map((med) => {
      const brand = escapeHtml(med.name || "Medicine");
      const strength = med.strength ? ` <em>${escapeHtml(med.strength)}</em>` : "";
      const code = rxDoseCode(med);
      const dose = code ? ` <span class="dose">${escapeHtml(code)}</span>` : "";
      return `<li>
<p class="brand"><strong>${brand}</strong>${strength}${dose}</p>
<p class="days">For how many days: ${escapeHtml(durationLabel(med))}</p>
</li>`;
    })
    .join("");
  const testRows = tests
    .map((test) => `<li>${escapeHtml(test.name || "")}</li>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Digital Rx</title>
<style>
body{font-family:Georgia,serif;margin:28px;color:#143246;background:#fff}
.card{border:1px solid #d7e8ec;border-radius:12px;padding:22px;max-width:640px}
.kicker{margin:0 0 8px;color:#1a6b7a;font-size:12px;font-weight:700;letter-spacing:.4px}
h1{margin:0 0 14px;font-size:22px}
p{margin:0 0 8px;font-size:15px;line-height:1.45}
ol,ul{margin:8px 0 0;padding-left:18px}
li{margin:0 0 10px}
.brand{margin:0 0 4px}
.brand em{font-style:normal;font-weight:700;color:#1a6b7a}
.dose{display:inline-block;margin-left:6px;font-size:12px;font-weight:800;letter-spacing:.04em;padding:1px 8px;border-radius:999px;background:#1a6b7a;color:#fff}
.days{margin:0;font-size:13px;color:#34546b}
h2{margin:16px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
</style></head><body>
<div class="card">
<p class="kicker">MediHome Digital Prescription</p>
<h1>Digital Rx</h1>
<p><strong>Patient:</strong> ${escapeHtml(patient)}</p>
${doctor ? `<p><strong>Doctor:</strong> ${escapeHtml(doctor)}</p>` : ""}
${date ? `<p><strong>Date:</strong> ${escapeHtml(date)}</p>` : ""}
<h2>Medicines</h2>
${medRows ? `<ol>${medRows}</ol>` : "<p>No medicines on this digital Rx.</p>"}
${testRows ? `<h2>Tests</h2><ul>${testRows}</ul>` : ""}
</div>
</body></html>`;
}

export function digitalPrescriptionDataUrl(record = {}) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(digitalPrescriptionHtml(record))}`;
}

export function saveConfirmedDigitalRx(parsed, draft = {}, extras = {}) {
  if (!parsed?.medicinesConfirmed) return null;
  const digital = buildDigitalRx(parsed);
  if (!digital?.medicines?.length) return null;
  const profile = extras.profile || readUserProfile();
  const session = extras.session || readLoginSession();
  const people = extras.people || householdReportPeople(profile, session);
  const person = extras.person || people[0] || null;
  const id = digitalRecordId(parsed, draft);
  const date = rxDateToIso(digital.date) || extras.today || isoDateToday();
  const payload = {
    ...digital,
    patientName: digital.patientName || person?.name || "",
    date: digital.date || date,
  };
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
