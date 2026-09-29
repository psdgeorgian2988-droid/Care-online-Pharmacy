import { LABORATORY_TESTS, RADIOLOGY_TESTS } from "./healthTestNames.js";
import {
  namedReportFileName,
  reportFileForOrder,
  reportObjectUrl,
} from "./labPipeline.js";
import {
  attachPatientIdentity,
  isHiddenMedicalRecordSource,
  medicalRecordPeople,
  patientIdentityFromSource,
  recordPatientName,
  reportBelongsTo,
} from "./reportPeople.js";
import { ALL_VACCINES, formatDisplayDate } from "./vaccinationSchedule.js";
import { givenVaccinationRecords } from "./vaccinationRecord.js";

const OBJECT_URL_BY_DATA = new Map();

export const MEDICAL_RECORD_KEY = "mediHomeReports";
export const MEDICAL_RECORD_EVENT = "medihome-reports";

const IMAGING_HINT =
  /\b(mri|ct|x-?ray|ultrasound|mammograph|doppler|scan|imaging|radiolog)/i;
const VACCINE_HINT = /\b(vaccin|immunis|immuniz)\b/i;

export function inferVaccinationKind(testName = "") {
  const name = String(testName || "").trim();
  if (!name) return "";
  if (ALL_VACCINES.some((row) => String(row.name || "").toLowerCase() === name.toLowerCase())) {
    return "vaccination";
  }
  if (VACCINE_HINT.test(name)) return "vaccination";
  return "";
}

export function inferDiagnosticKind(testName = "") {
  const name = String(testName || "").trim();
  if (!name) return "lab";
  if (RADIOLOGY_TESTS.includes(name)) return "radiology";
  if (LABORATORY_TESTS.includes(name)) return "lab";
  if (IMAGING_HINT.test(name)) return "radiology";
  return "lab";
}

/** Split stored rows: lab | radiology | prescription. */
export function medicalRecordKind(record) {
  const kind = String(record?.kind || record?.recordType || "").toLowerCase();
  if (kind === "prescription" || kind === "rx") return "prescription";
  if (kind === "radiology" || kind === "imaging") return "radiology";
  if (kind === "vaccination" || kind === "vax") return "vaccination";
  if (kind === "lab") return "lab";
  if (inferVaccinationKind(record?.testName || record?.vaccineName || record?.name)) {
    return "vaccination";
  }
  return inferDiagnosticKind(record?.testName || record?.name);
}

export function loadMedicalRecords(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(MEDICAL_RECORD_KEY) || "[]");
    return (Array.isArray(parsed) ? parsed : []).filter(
      (row) => !isHiddenMedicalRecordSource(row)
    );
  } catch {
    return [];
  }
}

export function saveMedicalRecords(list, storage = globalThis.localStorage) {
  const next = Array.isArray(list) ? list : [];
  if (!storage) return next;
  storage.setItem(MEDICAL_RECORD_KEY, JSON.stringify(next));
  if (storage === globalThis.localStorage && typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(new Event(MEDICAL_RECORD_EVENT));
  }
  return next;
}

export function recordsInSection(records, section) {
  const wanted = medicalRecordTabKind(section);
  if (!wanted) return [];
  return (Array.isArray(records) ? records : []).filter(
    (row) => medicalRecordKind(row) === wanted
  );
}

export function recordsForPatient(records, patientId, people = []) {
  return (Array.isArray(records) ? records : []).filter((row) =>
    reportBelongsTo(row, patientId, people)
  );
}

/** Resolve a tab id to a stored kind. Unknown / All never mix kinds. */
export function medicalRecordActiveKind(tab) {
  return medicalRecordTabKind(tab) || DEFAULT_MEDICAL_RECORD_TAB;
}

/** Hard filter: only the active tab's kind, then that patient if opened. */
export function recordsForActiveTab(records, tab, patientId = "", people = []) {
  const byKind = recordsInSection(records, medicalRecordActiveKind(tab));
  if (!patientId) return byKind;
  return recordsForPatient(byKind, patientId, people);
}

/** Patient folders for the active tab — extras from other kinds stay out. */
export function patientsForActiveTab(records, tab, people = []) {
  return medicalRecordPeople(people, recordsForActiveTab(records, tab));
}

/** One folder row per patient — never one card per file. */
export function uniquePatientsFromRecords(records, people = []) {
  const seen = new Set();
  const list = [];
  for (const row of Array.isArray(records) ? records : []) {
    if (isHiddenMedicalRecordSource(row)) continue;
    const identity = patientIdentityFromSource(row, people);
    if (isHiddenMedicalRecordSource(identity)) continue;
    const key = identity.patientId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push({
      id: key,
      patientId: key,
      name: identity.patientName || medicalRecordPatientName(row) || "Patient",
      patientName: identity.patientName || medicalRecordPatientName(row) || "Patient",
      mobile: identity.mobile || medicalRecordPatientMobile(row),
    });
  }
  return list;
}

export function medicalRecordPatientCard(patient = {}) {
  return {
    primary:
      String(patient.patientName || patient.name || "").trim() ||
      medicalRecordPatientName(patient) ||
      "Patient",
    secondary: medicalRecordPatientMobile(patient),
  };
}

/** Inside a patient folder: the test-named file, not the patient name. */
export function medicalRecordFileCard(record = {}) {
  const kind = medicalRecordKind(record);
  const fileName = medicalRecordStoredFileName(record);
  return {
    kind,
    primary: fileName || medicalRecordListTitle(record),
    secondary: String(record.date || "").trim(),
  };
}

export const MEDICAL_RECORD_TABS = [
  { id: "lab", label: "Lab report" },
  { id: "radiology", label: "Imaging report" },
  { id: "prescription", label: "Prescription" },
  { id: "vaccination", label: "Vaccination" },
];

export const DEFAULT_MEDICAL_RECORD_TAB = "lab";

export const MEDICAL_RECORD_VIEWER_ACTIONS = ["Save", "Print"];

export function medicalRecordTabKind(tab) {
  const id = String(tab || "").toLowerCase();
  if (id === "all" || id === "report" || id === "reports") return "";
  if (id === "prescription" || id === "rx") return "prescription";
  if (id === "radiology" || id === "imaging") return "radiology";
  if (id === "vaccination" || id === "vax") return "vaccination";
  if (id === "lab") return "lab";
  return "";
}

export function medicalRecordTabLabel(tab) {
  const kind = medicalRecordTabKind(tab) || medicalRecordActiveKind(tab);
  return MEDICAL_RECORD_TABS.find((row) => row.id === kind)?.label || "Lab report";
}

export function medicalRecordIsKindPage(tab) {
  return Boolean(medicalRecordTabKind(tab));
}

/** Sibling tabs after a kind is opened: none. Landing lists every kind. */
export function visibleMedicalRecordTabs(tab) {
  if (medicalRecordIsKindPage(tab)) return [];
  return MEDICAL_RECORD_TABS;
}

export function medicalRecordKindHref(tab, patientId = "") {
  const kind = medicalRecordTabKind(tab);
  if (!kind) return "#reports";
  const params = new URLSearchParams();
  params.set("service", kind);
  if (patientId) params.set("id", String(patientId));
  return `#reports?${params.toString()}`;
}

export function medicalRecordListTitle(record = {}) {
  return String(record.testName || record.name || "Report").trim() || "Report";
}

export function medicalRecordPatientName(record = {}) {
  return (
    recordPatientName(record) ||
    String(record.patientName || record.memberName || "").trim() ||
    "Patient"
  );
}

export function medicalRecordPatientMobile(record = {}) {
  return String(record.mobile || record.patientMobile || "")
    .replace(/\D/g, "")
    .slice(-10);
}

/** Lab / imaging cards: name + mobile only. Prescription keeps a title. */
export function medicalRecordListCard(record = {}) {
  const kind = medicalRecordKind(record);
  if (kind === "prescription") {
    return {
      kind,
      primary: medicalRecordListTitle(record),
      secondary: String(record.date || "").trim(),
    };
  }
  return {
    kind,
    primary: medicalRecordPatientName(record),
    secondary: medicalRecordPatientMobile(record),
  };
}

export function medicalRecordStoredFileName(record = {}) {
  return namedReportFileName(record, {
    fileName: record.fileName || record.reportFileName,
    fileType: record.fileType || record.reportFileType,
    testName: record.testName || record.reportTestName,
  });
}

export function medicalRecordHasFile(record = {}) {
  return Boolean(String(record.fileData || record.reportFileData || "").trim());
}

/** Normalize customer or partner file fields for the in-app viewer. */
export function medicalRecordForViewer(record = {}) {
  const file = reportFileForOrder(record) || {};
  let fileType = file.fileType || record.fileType || record.reportFileType || "";
  let fileData = file.fileData || record.fileData || record.reportFileData || "";
  let fileName = medicalRecordStoredFileName({
    ...record,
    ...file,
    fileType,
  });
  if (medicalRecordKind(record) === "vaccination" && !String(fileData || "").trim()) {
    fileData = vaccinationCertificateDataUrl(record);
    fileType = "text/html";
    const vaccineName =
      String(record.testName || record.vaccineName || "Vaccination").trim() || "Vaccination";
    fileName = `${vaccineName}.html`;
  }
  return {
    ...record,
    fileData,
    fileName,
    fileType,
  };
}

export function medicalRecordObjectUrl(record = {}) {
  const viewed = medicalRecordForViewer(record);
  const data = String(viewed.fileData || "");
  if (!data) return "";
  if (data.startsWith("blob:") || /^https?:\/\//i.test(data)) return data;
  const cached = OBJECT_URL_BY_DATA.get(data);
  if (cached) return cached;
  const url = reportObjectUrl(viewed);
  if (url && url.startsWith("blob:")) OBJECT_URL_BY_DATA.set(data, url);
  return url;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function vaccinationCertificateHtml(record = {}) {
  const patient = medicalRecordPatientName(record);
  const vaccine =
    String(record.testName || record.vaccineName || "Vaccination").trim() || "Vaccination";
  const givenOn =
    formatDisplayDate(record.date || record.givenOn) ||
    String(record.givenOnLabel || record.date || record.givenOn || "").trim() ||
    "—";
  const clinic = String(record.clinicName || record.name || "").trim();
  const notes = String(record.notes || "").trim();
  const mobile = medicalRecordPatientMobile(record);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(vaccine)}</title>
<style>
body{font-family:Georgia,serif;margin:32px;color:#143246;background:#fff}
.card{border:1px solid #d7e2e9;border-radius:12px;padding:24px;max-width:560px}
.kicker{margin:0 0 8px;color:#1a6b7a;font-size:12px;font-weight:700;letter-spacing:.4px}
h1{margin:0 0 16px;font-size:22px}
p{margin:0 0 8px;font-size:15px;line-height:1.45}
</style></head><body>
<div class="card">
<p class="kicker">MediHome Vaccination Record</p>
<h1>${escapeHtml(vaccine)}</h1>
<p><strong>Patient:</strong> ${escapeHtml(patient)}${mobile ? ` · ${escapeHtml(mobile)}` : ""}</p>
<p><strong>Given:</strong> ${escapeHtml(givenOn)}</p>
${clinic && clinic !== vaccine ? `<p><strong>Clinic:</strong> ${escapeHtml(clinic)}</p>` : ""}
${notes ? `<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : ""}
</div>
</body></html>`;
}

export function vaccinationCertificateDataUrl(record = {}) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(vaccinationCertificateHtml(record))}`;
}

function isVaccinationOrder(order = {}) {
  const kind = String(order.kind || order.orderType || order.recordType || "").toLowerCase();
  return kind === "vaccination" || kind === "vax";
}

function vaccinationOrderVisible(order = {}) {
  if (order.reportFileData || order.reportFileName || order.fileData || order.fileName) {
    return true;
  }
  if (order.trackCompleted) return true;
  const status = String(order.trackStatus || order.status || "").toLowerCase();
  return (
    status === "done" ||
    status === "completed" ||
    status === "report_ready" ||
    status === "given"
  );
}

export function vaccinationItemsLabel(order = {}) {
  const explicit = String(
    order.reportTestName || order.testName || order.vaccineName || ""
  ).trim();
  if (
    explicit &&
    !/^nurse visit/i.test(explicit) &&
    !/^vaccination$/i.test(explicit)
  ) {
    return explicit;
  }
  const names = [
    ...(Array.isArray(order.items) ? order.items : []),
    ...(Array.isArray(order.vaccines) ? order.vaccines : []),
    ...(Array.isArray(order.tests) ? order.tests : []),
  ]
    .map((row) => String(row?.name || row?.testName || row?.vaccineName || "").trim())
    .filter((name) => name && !/^nurse visit/i.test(name));
  if (names.length) return [...new Set(names)].join(", ");
  return explicit || "Vaccination";
}

export function vaccinationDoseAsMedicalRecord(dose = {}, people = []) {
  const testName =
    String(dose.vaccineName || dose.testName || "Vaccination").trim() || "Vaccination";
  const identity = attachPatientIdentity(
    {
      patientName: dose.personName || dose.patientName || dose.name || "",
      memberName: dose.personName || dose.patientName || "",
      mobile: dose.mobile || dose.patientMobile || "",
    },
    {
      patientName: dose.personName || dose.patientName || "",
      mobile: dose.mobile || dose.patientMobile || "",
    },
    people
  );
  const date = String(dose.givenOn || dose.date || "").trim();
  const hasFile = Boolean(String(dose.fileData || dose.reportFileData || "").trim());
  return {
    id: dose.id || `vacd-${identity.patientId}-${dose.vaccineId || testName}-${date}`,
    ...identity,
    kind: "vaccination",
    testName,
    name: testName,
    date,
    notes: dose.notes || "",
    fileName: hasFile
      ? namedReportFileName(
          { testName },
          { fileName: dose.fileName || dose.reportFileName, fileType: dose.fileType }
        )
      : `${testName}.html`,
    fileType: hasFile
      ? dose.fileType || dose.reportFileType || ""
      : "text/html",
    fileData: dose.fileData || dose.reportFileData || "",
    source: dose.source || "vaccination-record",
    vaccineId: dose.vaccineId || "",
    givenOn: date,
    bookingId: dose.bookingId || "",
    orderId: dose.orderId || dose.bookingId || "",
  };
}

export function medicalRecordsFromVaccinationStore(store, people = []) {
  return givenVaccinationRecords(store).map((row) =>
    vaccinationDoseAsMedicalRecord(row, people)
  );
}

export function medicalRecordFromVaccinationOrder(order = {}, people = []) {
  if (!isVaccinationOrder(order) || !vaccinationOrderVisible(order)) return null;
  if (isHiddenMedicalRecordSource(order)) return null;
  const identity = attachPatientIdentity({}, order, people);
  const testName = vaccinationItemsLabel(order);
  const hasFile = Boolean(String(order.reportFileData || order.fileData || "").trim());
  const id = String(order.id || order.bookingId || order.requestId || "");
  const rawDate = String(order.date || order.visitDate || "").trim();
  const date =
    rawDate.slice(0, 10) ||
    (order.reportUploadedAt || order.completedAt
      ? new Date(order.reportUploadedAt || order.completedAt).toISOString().slice(0, 10)
      : "");
  return {
    id: id ? `ord-${id}` : `ord-vax-${identity.patientId}-${testName}-${date}`,
    orderId: id,
    ...identity,
    kind: "vaccination",
    testName,
    name: identity.patientName || testName,
    date,
    notes: order.reportNotes || order.notes || "",
    fileName: hasFile
      ? namedReportFileName(
          { testName },
          {
            fileName: order.reportFileName || order.fileName,
            fileType: order.reportFileType || order.fileType,
          }
        )
      : `${testName}.html`,
    fileType: hasFile
      ? order.reportFileType || order.fileType || ""
      : "text/html",
    fileData: order.reportFileData || order.fileData || "",
    source: order.source || "partner",
  };
}

export function collectMedicalRecords(records, extras = {}) {
  const stored = Array.isArray(records) ? records : [];
  const people = extras.people || [];
  const fromStore = medicalRecordsFromVaccinationStore(extras.vaxStore, people);
  const fromOrders = (Array.isArray(extras.orders) ? extras.orders : [])
    .map((order) => medicalRecordFromVaccinationOrder(order, people))
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  const keyOf = (row) => {
    if (row.orderId) return `ord:${row.orderId}`;
    const id = String(row.id || "");
    if (id) return `id:${id}`;
    return `vax:${medicalRecordPatientName(row)}:${row.testName}:${row.date}`;
  };
  for (const row of [...stored, ...fromStore, ...fromOrders]) {
    if (!row || isHiddenMedicalRecordSource(row)) continue;
    const key = keyOf(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function emptyMedicalUploadForm(today = "", extras = {}) {
  const kind = medicalRecordTabKind(extras.tab) || extras.reportKind || "lab";
  return {
    memberId: extras.memberId || extras.patientId || "",
    reportKind: kind === "prescription" ? "lab" : kind,
    testName: "",
    date: today,
    clinicName: "",
    notes: "",
    fileName: "",
    fileType: "",
    fileData: "",
  };
}

/** Details step only — file is asked after this passes. */
export function validateMedicalUploadDetails(tab, form = {}, options = {}) {
  const errors = {};
  const people = Array.isArray(options.people) ? options.people : null;
  const section = medicalRecordTabKind(tab) || (tab === "report" ? "report" : "");
  if (people && people.length > 1 && !String(form.memberId || "").trim()) {
    errors.memberId =
      section === "prescription"
        ? "Select whose prescription this is."
        : section === "vaccination"
          ? "Select whose vaccination record this is."
          : "Select whose report this is.";
  }
  if (!String(form.date || "").trim()) {
    errors.date = "Please select a date.";
  }
  if (section === "vaccination") {
    if (options.addingTest) {
      errors.testName = "Add the new vaccine name, or pick one from the list.";
    } else if (!String(form.testName || "").trim()) {
      errors.testName = "Please select a vaccine name.";
    }
    return errors;
  }
  if (section && section !== "prescription") {
    const implied = section === "report" ? "" : section;
    const kind = String(implied || form.reportKind || "").toLowerCase();
    if (kind !== "lab" && kind !== "radiology") {
      errors.reportKind = "Choose Lab report or Imaging report.";
    }
    if (options.addingTest) {
      errors.testName = "Add the new test name, or pick one from the list.";
    } else if (!String(form.testName || "").trim()) {
      errors.testName = "Please select a test or scan name.";
    }
  }
  return errors;
}

export function validateMedicalUploadFile(form = {}) {
  const errors = {};
  if (!String(form.fileName || "").trim()) {
    errors.file = "Choose a PDF or image to upload.";
  }
  return errors;
}

export function buildCustomerMedicalRecord(tab, form = {}, extras = {}) {
  const person = extras.person || null;
  const now = extras.now instanceof Date ? extras.now : new Date();
  const savedAt = extras.savedAt || now.toLocaleString();
  const identity = attachPatientIdentity(
    {
      memberId: person?.id || form.memberId || form.patientId || "",
      patientId: person?.id || form.patientId || form.memberId || "",
      memberName: person?.name || form.memberName || "",
      patientName: person?.name || form.patientName || form.memberName || "",
      mobile: person?.mobile || form.mobile || "",
    },
    form,
    extras.people || (person ? [person] : [])
  );
  const clinicName = String(form.clinicName || "").trim();
  const notes = String(form.notes || "").trim();
  const date = String(form.date || "").trim();
  const fileType = form.fileType || "";
  const fileData = form.fileData || "";

  const section = medicalRecordTabKind(tab);
  if (section === "vaccination" || tab === "vaccination") {
    const testName = String(form.testName || form.vaccineName || "").trim() || "Vaccination";
    return {
      id: extras.id || "MH-VAX-" + now.getTime(),
      ...identity,
      kind: "vaccination",
      testName,
      name: clinicName || testName,
      date,
      notes,
      fileName: namedReportFileName(
        { testName },
        { fileName: form.fileName, fileType }
      ),
      fileType,
      fileData,
      savedAt,
      source: "customer",
    };
  }
  if (section === "prescription" || tab === "prescription") {
    const testName = "Prescription";
    return {
      id: extras.id || "MH-RX-" + now.getTime(),
      ...identity,
      kind: "prescription",
      testName,
      name: clinicName || "Prescription",
      date,
      notes,
      fileName: namedReportFileName(
        { testName },
        { fileName: form.fileName, fileType }
      ),
      fileType,
      fileData,
      savedAt,
      source: "customer",
    };
  }

  const testName = String(form.testName || "").trim();
  const kind =
    section === "lab" || section === "radiology"
      ? section
      : form.reportKind === "radiology" || form.reportKind === "imaging"
        ? "radiology"
        : "lab";
  return {
    id: extras.id || "MH-RPT-" + now.getTime(),
    ...identity,
    kind,
    testName,
    name: clinicName || testName,
    date,
    notes,
    fileName: namedReportFileName(
      { testName },
      { fileName: form.fileName, fileType }
    ),
    fileType,
    fileData,
    savedAt,
    source: "customer",
  };
}

export function downloadMedicalRecordFile(record, doc = globalThis.document) {
  const file = medicalRecordForViewer(record);
  const url = reportObjectUrl(file);
  if (!url || !doc?.createElement) return false;
  const link = doc.createElement("a");
  link.href = url;
  link.download = medicalRecordStoredFileName({ ...record, ...file });
  if (doc.body?.appendChild) doc.body.appendChild(link);
  if (typeof link.click === "function") link.click();
  if (doc.body?.removeChild) doc.body.removeChild(link);
  else if (typeof link.remove === "function") link.remove();
  return true;
}

export function printMedicalRecordFile(record, win = globalThis) {
  const url = medicalRecordObjectUrl(record);
  if (!url) return false;
  const popup = win?.open?.(url, "_blank", "noopener,noreferrer");
  if (popup) {
    const run = () => {
      try {
        popup.focus?.();
        popup.print?.();
      } catch {
        /* ignore blocked print */
      }
    };
    if (typeof popup.addEventListener === "function") {
      popup.addEventListener("load", run);
    } else {
      run();
    }
    return true;
  }
  try {
    win?.print?.();
    return true;
  } catch {
    return false;
  }
}
