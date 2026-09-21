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
  { key: "confirmed", label: "Partner Accepted" },
  { key: "assigned", label: "Technician Assigned" },
  { key: "sample_collected", label: "Sample Collected" },
  { key: "report_ready", label: "Report Ready" },
  { key: "done", label: "Completed" },
  { key: "declined", label: "Declined" },
];

export function diagnosticStepLabel(key, kind = "lab") {
  const hit = DIAGNOSTIC_TRACK_STEPS.find((step) => step.key === key);
  if (hit) return hit.label;
  if (key === "done") return "Completed";
  return kind === "radiology" ? "Imaging Update" : "Lab Update";
}

export function assignTechnicianFields({ name, mobile } = {}, now = Date.now()) {
  const technicianName = String(name || "").trim();
  const technicianMobile = String(mobile || "").replace(/\D/g, "").slice(0, 10);
  return {
    trackStatus: "assigned",
    status: "Technician Assigned",
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

export function reportReadyFields(report = {}, now = Date.now()) {
  return {
    trackStatus: "report_ready",
    status: "Report Ready",
    reportUploadedAt: now,
    reportFileName: String(report.fileName || "").trim(),
    reportFileType: String(report.fileType || "").trim(),
    reportFileData: String(report.fileData || ""),
    reportTestName: String(report.testName || "").trim(),
    reportNotes: String(report.notes || "").trim(),
  };
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
  if (String(order?.partnerConfirmStatus || "") === "pending" || !order?.partnerConfirmed) {
    return "confirm";
  }
  const status = String(order?.trackStatus || "").toLowerCase();
  if (status === "confirmed" || (status === "assigned" && !String(order?.technicianName || "").trim())) {
    return "assign_technician";
  }
  if (status === "assigned") return "sample_collect";
  if (status === "sample_collected") {
    const paid = String(order?.paymentStatus || "").toLowerCase() === "paid";
    if (!paid) return "collect_payment";
    return "upload_report";
  }
  if (status === "report_ready") return "complete";
  return "";
}

/** Persist partner-uploaded report into the customer reports list (local). */
export function reportRecordFromOrder(order) {
  if (!order?.reportFileData && !order?.reportFileName) return null;
  const id = String(order.id || order.bookingId || order.requestId || "");
  const tests = Array.isArray(order.tests)
    ? order.tests.map((row) => row?.name).filter(Boolean).join(", ")
    : "";
  return {
    id: `ord-${id}`,
    orderId: id,
    kind: diagnosticKindOf(order) || "lab",
    testName: order.reportTestName || tests || "Diagnostic report",
    name: order.patientName || order.name || "",
    mobile: order.mobile || "",
    date: new Date(order.reportUploadedAt || Date.now()).toISOString().slice(0, 10),
    notes: order.reportNotes || `From booking ${id}`,
    fileName: order.reportFileName || "",
    fileType: order.reportFileType || "",
    fileData: order.reportFileData || "",
    source: "partner",
  };
}

export function mergeOrderReportIntoStore(order, storage = globalThis.localStorage) {
  const row = reportRecordFromOrder(order);
  if (!row || !storage) return null;
  let list = [];
  try {
    const parsed = JSON.parse(storage.getItem("mediHomeReports") || "[]");
    list = Array.isArray(parsed) ? parsed : [];
  } catch {
    list = [];
  }
  const next = [row, ...list.filter((item) => item.id !== row.id && item.orderId !== row.orderId)];
  storage.setItem("mediHomeReports", JSON.stringify(next));
  return row;
}
