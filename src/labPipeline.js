import { isHiddenMedicalRecordSource, patientIdentityFromSource } from "./reportPeople.js";

/** Lab / radiology partner-driven pipeline helpers. */

export const DIAGNOSTIC_KINDS = new Set(["lab", "radiology"]);

export function isDiagnosticKind(kind) {
  return DIAGNOSTIC_KINDS.has(String(kind || "").toLowerCase());
}

export function diagnosticKindOf(order) {
  return String(order?.kind || order?.orderType || order?.serviceType || "").toLowerCase();
}

/** Steps shown on partner desk and customer track for diagnostics. */
export const DIAGNOSTIC_TRACK_STEPS = [
  { key: "requested", label: "Awaiting Partner Confirmation" },
  { key: "slot_offered", label: "Awaiting Customer Slot Confirmation" },
  { key: "confirmed", label: "Partner Accepted" },
  { key: "assigned", label: "Partner Assigned" },
  { key: "sample_collected", label: "Sample Collected" },
  { key: "report_ready", label: "Report Ready" },
  { key: "done", label: "Completed" },
  { key: "declined", label: "Declined" },
];

export function diagnosticStepLabel(key, kind = "lab") {
  const hit = DIAGNOSTIC_TRACK_STEPS.find((step) => step.key === key);
  if (hit) return hit.label;
  if (key === "done") return "Completed";
  if (key === "packed" || key === "on_the_way" || key === "arriving") {
    return "Partner Accepted";
  }
  return "In progress";
}

export function assignTechnicianFields({ name, mobile } = {}, now = Date.now()) {
  const technicianName = String(name || "").trim();
  const technicianMobile = String(mobile || "").replace(/\D/g, "").slice(0, 10);
  return {
    trackStatus: "assigned",
    status: "Partner Assigned",
    technicianName,
    technicianMobile,
    technicianAssignedAt: now,
  };
}

export function sampleCollectedFields(now = Date.now()) {
  return {
    trackStatus: "sample_collected",
    status: "Sample Collected",
    sampleCollectedAt: now,
  };
}

const FILE_EXT_BY_TYPE = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const GENERIC_REPORT_NAME = /^(report|untitled|document|image|scan|photo|file)(\s*\(\d+\))?$/i;

function itemTestLabel(row) {
  return String(row?.name || row?.testName || row?.title || row?.label || "").trim();
}

/** Test / scan name from an order, upload, or stored report. */
export function diagnosticTestName(source = {}) {
  const explicit = String(
    source.reportTestName || source.testName || source.scanName || ""
  ).trim();
  if (explicit && !GENERIC_REPORT_NAME.test(explicit) && !/^diagnostic report$/i.test(explicit)) {
    return explicit;
  }
  const fromLists = [
    ...(Array.isArray(source.tests) ? source.tests : []),
    ...(Array.isArray(source.items) ? source.items : []),
  ]
    .map(itemTestLabel)
    .filter(Boolean);
  if (fromLists.length) return [...new Set(fromLists)].join(", ");
  return explicit;
}

export function reportFileExtension(fileName = "", fileType = "") {
  const type = String(fileType || "").toLowerCase();
  if (FILE_EXT_BY_TYPE[type]) return FILE_EXT_BY_TYPE[type];
  if (type.startsWith("image/")) {
    const subtype = type.slice(6).split("+")[0].replace(/[^a-z0-9]/g, "");
    if (subtype === "jpeg") return "jpg";
    if (subtype) return subtype;
  }
  const fromName = String(fileName || "").match(/\.([a-z0-9]+)$/i);
  if (fromName) return fromName[1].toLowerCase() === "jpeg" ? "jpg" : fromName[1].toLowerCase();
  return "pdf";
}

export function sanitizeReportBaseName(name = "") {
  return String(name || "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/g, "");
}

/** Download / stored filename = test name + type extension. Never generic report.pdf when a test exists. */
export function namedReportFileName(source = {}, file = {}) {
  const incomingName = String(
    file.fileName || source.fileName || source.reportFileName || ""
  ).trim();
  const incomingType = String(
    file.fileType || source.fileType || source.reportFileType || ""
  ).trim();
  const ext = reportFileExtension(incomingName, incomingType);
  const testName = diagnosticTestName({ ...source, ...file });
  const base = sanitizeReportBaseName(testName.replace(/\.[a-z0-9]+$/i, ""));
  if (base) return `${base}.${ext}`;
  if (incomingName && !GENERIC_REPORT_NAME.test(sanitizeReportBaseName(incomingName.replace(/\.[a-z0-9]+$/i, "")))) {
    return incomingName;
  }
  return `report.${ext}`;
}

export function reportReadyFields(report = {}, now = Date.now()) {
  const testName = String(report.testName || "").trim();
  return {
    ...diagnosticCompleteFields(now),
    reportUploadedAt: now,
    reportFileName: namedReportFileName({ testName }, report),
    reportFileType: String(report.fileType || "").trim(),
    reportFileData: String(report.fileData || ""),
    reportTestName: testName,
    reportNotes: String(report.notes || "").trim(),
  };
}

export function labJobCanReceiveReport(order) {
  if (!order) return false;
  if (!isDiagnosticKind(diagnosticKindOf(order))) return false;
  const status = String(order.trackStatus || "").toLowerCase();
  if (status === "done" || status === "declined") return false;
  if (order.trackCompleted) return false;
  return true;
}

export function labReportTargetJob(jobs, openJobId = "") {
  const list = Array.isArray(jobs) ? jobs : [];
  const wanted = String(openJobId || "").trim();
  const idOf = (row) => String(row?.id || row?.bookingId || row?.requestId || "");
  const eligible = list.filter((row) => {
    if (!row || !isDiagnosticKind(diagnosticKindOf(row))) return false;
    return String(row.trackStatus || "").toLowerCase() !== "declined";
  });
  if (wanted) {
    const selected = eligible.find((row) => idOf(row) === wanted);
    if (selected) return selected;
  }
  return eligible.find(labJobCanReceiveReport) || eligible[0] || null;
}

export function diagnosticCompleteFields(now = Date.now()) {
  return {
    trackStatus: "done",
    status: "Completed",
    trackCompleted: true,
    completedAt: now,
  };
}

export function nextDiagnosticAction(order) {
  const kind = diagnosticKindOf(order);
  if (!isDiagnosticKind(kind)) return "";
  const confirm = String(order?.partnerConfirmStatus || "").toLowerCase();
  const slot = String(order?.slotConfirmStatus || "").toLowerCase();
  if (confirm === "slot_offered" || slot === "offered") return "await_customer_slot";
  if (confirm === "pending" || confirm === "slot_rejected" || !order?.partnerConfirmed) {
    return "confirm";
  }
  const status = String(order?.trackStatus || "").toLowerCase();
  if (status === "confirmed" || (status === "assigned" && !String(order?.technicianName || "").trim())) {
    return "assign_technician";
  }
  if (status === "assigned") return "sample_collect";
  if (status === "sample_collected") return "upload_report";
  if (status === "report_ready") return "complete";
  return "";
}

export function isLabReportUploadFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) return true;
  if (type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(name);
}

/** Persist partner-uploaded report into the customer reports list (local). */
export function reportRecordFromOrder(order, people = []) {
  if (!order?.reportFileData && !order?.reportFileName) return null;
  const id = String(order.id || order.bookingId || order.requestId || "");
  const identity = patientIdentityFromSource(order, people);
  const testName = diagnosticTestName(order);
  const fileName = namedReportFileName({ ...order, testName }, order);
  return {
    id: `ord-${id}`,
    orderId: id,
    patientId: identity.patientId,
    patientName: identity.patientName,
    memberId: identity.patientId,
    memberName: identity.patientName,
    kind: diagnosticKindOf(order) || "lab",
    testName: testName || "Diagnostic report",
    name: identity.patientName || order.patientName || order.name || "",
    mobile: identity.mobile || order.mobile || "",
    date: new Date(order.reportUploadedAt || Date.now()).toISOString().slice(0, 10),
    notes: order.reportNotes || `From booking ${id}`,
    fileName,
    fileType: order.reportFileType || order.fileType || "",
    fileData: order.reportFileData || order.fileData || "",
    source: "partner",
  };
}

export function mergeOrderReportIntoStore(order, storage = globalThis.localStorage, people = []) {
  const row = reportRecordFromOrder(order, people);
  if (!row || !storage) return null;
  if (isHiddenMedicalRecordSource(order) || isHiddenMedicalRecordSource(row)) return null;
  let list = [];
  try {
    const parsed = JSON.parse(storage.getItem("mediHomeReports") || "[]");
    list = Array.isArray(parsed) ? parsed : [];
  } catch {
    list = [];
  }
  const next = [row, ...list.filter((item) => item.id !== row.id && item.orderId !== row.orderId)];
  storage.setItem("mediHomeReports", JSON.stringify(next));
  if (storage === globalThis.localStorage && typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(new Event("medihome-reports"));
  }
  return row;
}

export function loadStoredReports(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem("mediHomeReports") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findStoredReport(orderId, storage = globalThis.localStorage) {
  const wanted = String(orderId || "").trim();
  if (!wanted) return null;
  return (
    loadStoredReports(storage).find(
      (row) =>
        String(row.orderId || "") === wanted ||
        String(row.id || "") === `ord-${wanted}`
    ) || null
  );
}

export function reportFileForOrder(order, storage = globalThis.localStorage) {
  const fileData = String(order?.reportFileData || order?.fileData || "");
  const fileType = String(order?.reportFileType || order?.fileType || "").trim();
  const fileName = namedReportFileName(order, {
    fileName: String(order?.reportFileName || order?.fileName || "").trim(),
    fileType,
  });
  if (fileData) {
    return { fileData, fileName, fileType };
  }
  const stored = findStoredReport(
    order?.id || order?.bookingId || order?.orderId || order?.requestId,
    storage
  );
  if (stored?.fileData) {
    return {
      fileData: String(stored.fileData || ""),
      fileName: namedReportFileName({ ...order, ...stored }, stored),
      fileType: String(stored.fileType || fileType),
    };
  }
  return fileName ? { fileData: "", fileName, fileType } : null;
}

export function dataUrlToBytes(dataUrl, mimeHint = "") {
  const data = String(dataUrl || "");
  if (!data.startsWith("data:")) return null;
  const comma = data.indexOf(",");
  if (comma < 0) return null;
  const header = data.slice(0, comma);
  const payload = data.slice(comma + 1);
  const mime =
    String(mimeHint || "").trim() ||
    header.match(/^data:([^;,]+)/i)?.[1] ||
    "application/octet-stream";
  try {
    const binary = /;base64/i.test(header) ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, mime };
  } catch {
    return null;
  }
}

export function reportObjectUrl(file = {}) {
  const data = String(file.fileData || file.reportFileData || "");
  const type = String(file.fileType || file.reportFileType || "").trim();
  if (!data) return "";
  if (data.startsWith("blob:") || /^https?:\/\//i.test(data)) return data;
  const parsed = dataUrlToBytes(data, type);
  if (!parsed) return data.startsWith("data:") ? "" : data;
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return data;
  }
  try {
    return URL.createObjectURL(new Blob([parsed.bytes], { type: parsed.mime }));
  } catch {
    return "";
  }
}

export function openReportFile(file, opener = globalThis.open) {
  const resolved = reportFileForOrder(file) || file;
  const url = reportObjectUrl(resolved);
  if (!url) return false;
  const opened = opener?.(url, "_blank", "noopener,noreferrer");
  if (opened) return true;
  if (typeof document === "undefined") return Boolean(url);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const name = namedReportFileName(resolved || file, resolved || file);
    if (name) link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
}
