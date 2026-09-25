import { formatOrderMobile, orderPatientName, orderRecordId } from "./orderFullFields.js";
import { isStepdownCancelled } from "./stepdownCancel.js";
import {
  createStepdownPatientAccount,
  finalizeStepdownBill,
  startStepdownBill,
} from "./stepdownBill.js";

export const STEPDOWN_PAY_OPTIONS = [
  { value: "cod", label: "Cash" },
  { value: "qr", label: "QR Code" },
  { value: "upi", label: "UPI" },
];

export function isStepdownPayMethod(method) {
  return STEPDOWN_PAY_OPTIONS.some((row) => row.value === String(method || "").toLowerCase());
}

export function isStepdownPaid(order = {}) {
  return (
    order?.paid === true ||
    String(order?.paymentStatus || "").toLowerCase() === "paid"
  );
}

const CARE_TYPE_LABELS = {
  "post-icu": "Post-ICU step-down",
  "post-surgery": "Post-surgery recovery",
  rehab: "Rehab & physiotherapy",
  wound: "Wound / drain care",
  assisted: "Assisted recovery at home",
};

export const STEPDOWN_DESK_TABS = [
  { id: "patient", label: "Name of the Patient" },
  { id: "contact", label: "Contact Details" },
  { id: "attendant", label: "Alternate Mobile No" },
  { id: "care", label: "Type of Care" },
  { id: "days", label: "No of Days" },
  { id: "discharge", label: "Discharge Summary" },
  { id: "prescription", label: "Prescription" },
];

export const STEPDOWN_LIST_TABS = [
  { id: "new", label: "New Booking" },
  { id: "accepted", label: "Booking Accepted" },
  { id: "admitted", label: "Admitted" },
  { id: "discharged", label: "Discharged" },
];

export function isStepdownDischarged(order) {
  return (
    order?.discharged === true ||
    String(order?.trackStatus || "").toLowerCase() === "discharged" ||
    String(order?.status || "").toLowerCase() === "discharged"
  );
}

export function isStepdownAdmitted(order) {
  if (isStepdownDischarged(order)) return false;
  return (
    order?.admitted === true ||
    String(order?.trackStatus || "").toLowerCase() === "admitted" ||
    String(order?.status || "").toLowerCase() === "admitted"
  );
}

export function stepdownDischargeFields(order = {}, extras = {}, now = Date.now()) {
  if (typeof order === "number") {
    now = order;
    order = {};
    extras = {};
  }
  const method = String(extras.paymentMethod || "").toLowerCase();
  const paid = extras.paid === true && isStepdownPayMethod(method);
  const bill = finalizeStepdownBill(order, { ...extras, paid, paymentMethod: method }, now);
  return {
    discharged: true,
    dischargedAt: now,
    trackStatus: "discharged",
    status: paid ? "Discharged · Paid" : "Discharged",
    ...bill,
  };
}

export function stepdownListTab(order) {
  const decision = stepdownBookingDecision(order);
  if (decision === "cancelled" || decision === "unavailable") return "";
  if (isStepdownDischarged(order)) return "discharged";
  if (isStepdownAdmitted(order)) return "admitted";
  if (decision === "confirmed") return "accepted";
  return "new";
}

export function stepdownStageLabel(order) {
  const tab = stepdownListTab(order);
  if (tab === "discharged") return "Back home";
  if (tab === "admitted") return "Admitted";
  if (tab === "accepted") return "Booking Accepted";
  if (isStepdownCancelled(order)) return "Cancelled";
  if (stepdownBookingDecision(order) === "unavailable") return "Not Available";
  return "New Booking";
}

export const STEPDOWN_INCHARGE_ROLE = "Centre in-charge";

export function stepdownInchargeName(source = {}) {
  return String(
    source.inchargeName ||
      source.contactName ||
      source.agentName ||
      source.name ||
      source.partnerName ||
      ""
  ).trim();
}

export function stepdownInchargeMobile(source = {}) {
  return String(
    source.inchargeMobile ||
      source.agentMobile ||
      source.mobile ||
      source.partnerMobile ||
      ""
  )
    .replace(/\D/g, "")
    .slice(-10);
}

export function stepdownInchargeFields(partner = {}, extras = {}) {
  const source = {
    ...partner,
    ...extras,
    inchargeName:
      extras.inchargeName ||
      partner.inchargeName ||
      extras.contactName ||
      partner.contactName ||
      extras.agentName ||
      partner.name ||
      extras.partnerName,
    inchargeMobile:
      extras.inchargeMobile ||
      partner.inchargeMobile ||
      extras.agentMobile ||
      extras.mobile ||
      partner.mobile ||
      extras.partnerMobile,
    inchargeRole: extras.inchargeRole || partner.inchargeRole || STEPDOWN_INCHARGE_ROLE,
  };
  const inchargeName = stepdownInchargeName(source);
  const inchargeMobile = stepdownInchargeMobile(source);
  const inchargeRole = String(source.inchargeRole || STEPDOWN_INCHARGE_ROLE).trim();
  if (!inchargeName || inchargeMobile.length !== 10) return {};
  return {
    inchargeName,
    inchargeMobile,
    inchargeRole,
    agentName: inchargeName,
    agentMobile: inchargeMobile,
    agentRole: inchargeRole,
  };
}

export function stepdownAdmitFields(order = {}, extras = {}, now = Date.now()) {
  const roomNo = String(extras.roomNo || order?.roomNo || "").trim();
  const bedNo = String(extras.bedNo || order?.bedNo || "").trim();
  return {
    admitted: true,
    admittedAt: now,
    patientReached: true,
    roomNo,
    bedNo,
    trackStatus: "admitted",
    status: "Admitted",
    ...stepdownInchargeFields(extras.partner || extras, { ...order, ...extras }),
    ...createStepdownPatientAccount(order, extras, now),
    ...startStepdownBill({ ...order, ...extras }, { now }),
  };
}

export function isStepdownNewBooking(order) {
  return stepdownListTab(order) === "new";
}

export function ordersForStepdownListTab(orders, tabId) {
  const list = Array.isArray(orders) ? orders : [];
  const tab = String(tabId || "new");
  return list.filter((order) => stepdownListTab(order) === tab);
}

export function stepdownDeskField(order, tabId) {
  if (tabId === "patient") return stepdownPatientName(order);
  if (tabId === "contact") return stepdownContactDetails(order).mobile || "—";
  if (tabId === "attendant") return stepdownAttendantMobile(order) || "—";
  if (tabId === "care") return stepdownCareType(order);
  if (tabId === "days") return stepdownDays(order) || "—";
  if (tabId === "discharge" || tabId === "prescription") {
    return stepdownDocument(order, tabId);
  }
  return "—";
}

export function stepdownBookingDecision(order) {
  if (isStepdownCancelled(order)) return "cancelled";
  const confirm = String(order?.partnerConfirmStatus || "").toLowerCase();
  if (confirm === "accepted" || order?.partnerConfirmed === true) return "confirmed";
  if (confirm === "declined") return "unavailable";
  return "pending";
}

export function stepdownPatientName(order) {
  return orderPatientName(order).trim() || "Name not given";
}

export function stepdownCareType(order) {
  const labelled = String(order?.serviceLabel || "").trim();
  if (labelled) return labelled;
  const key = String(order?.serviceType || order?.careType || "").toLowerCase();
  return CARE_TYPE_LABELS[key] || String(order?.serviceType || "").trim() || "Care type not given";
}

export function stepdownContactDetails(order) {
  return {
    id: orderRecordId(order),
    mobile: formatOrderMobile(
      order?.mobile || order?.phone || order?.phoneNumber || "",
      "partner",
      "stepdown"
    ),
  };
}

export function stepdownDays(order) {
  const days = Number(order?.durationDays);
  if (Number.isFinite(days) && days > 0) return String(days);
  return "";
}

export function stepdownAttendantMobile(order) {
  return formatOrderMobile(
    order?.alternateMobile || order?.attendantMobile || order?.attendantPhone || "",
    "partner",
    "stepdown"
  );
}

export function stepdownDocument(order, kind = "discharge") {
  if (kind === "prescription") {
    return {
      id: orderRecordId(order),
      name:
        String(order?.prescriptionName || order?.prescription || order?.rxShare?.fileName || "").trim(),
      href: String(order?.prescriptionFile || order?.rxShare?.originalFile || "").trim(),
      type: String(order?.prescriptionType || order?.rxShare?.fileType || "").trim(),
    };
  }
  return {
    id: orderRecordId(order),
    name: String(order?.dischargeSummaryName || "").trim(),
    href: String(order?.dischargeSummaryFile || "").trim(),
    type: String(order?.dischargeSummaryType || "").trim(),
  };
}

export function isStepdownImageFile(file) {
  const href = String(file?.href || "");
  const kind = String(file?.type || "").toLowerCase();
  return (
    kind.startsWith("image/") ||
    /^data:image\//i.test(href) ||
    /\.(png|jpe?g|gif|webp|bmp)(\?|#|$)/i.test(href)
  );
}

export function stepdownFileObjectUrl(file) {
  return fileHrefToObjectUrl(String(file?.href || ""), String(file?.type || ""));
}

export function downloadStepdownDocument(file, title = "Document") {
  const href = String(file?.href || "").trim();
  if (!href || typeof document === "undefined") return false;
  const url = fileHrefToObjectUrl(href, file?.type);
  const link = document.createElement("a");
  const fallback = isStepdownImageFile(file) ? `${title}.jpg` : `${title}.pdf`;
  link.href = url;
  link.download = String(file?.name || fallback).replace(/[<>:"/\\|?*]/g, "-");
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (url.startsWith("blob:") && url !== href) {
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return true;
}

export function printStepdownDocument(file, title = "Document") {
  const href = String(file?.href || "").trim();
  if (!href || typeof window === "undefined") return false;
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return false;

  const kind = String(file?.type || "").toLowerCase();
  const isImage = isStepdownImageFile(file);
  const objectUrl = fileHrefToObjectUrl(href, kind);
  const safeTitle = String(title || "Document").replace(/[<>&]/g, "");
  const src = String(objectUrl).replace(/"/g, "&quot;");

  popup.document.open();
  popup.document.write(`<!doctype html>
<html>
<head>
  <title>${safeTitle}</title>
  <style>
    @page { margin: 10mm; }
    html, body { margin: 0; background: #fff; }
    .file-bar{display:flex;justify-content:flex-end;gap:8px;padding:10px 12px;background:#f3f7f9;border-bottom:1px solid #d7e2e9}
    .file-bar button{border:1px solid #c5d6de;background:#fff;color:#1a6b7a;border-radius:6px;font:12px/1.2 sans-serif;font-weight:800;min-height:32px;padding:0 12px;cursor:pointer}
    img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    embed, iframe { width: 100%; height: calc(100vh - 54px); border: 0; }
    @media print { .file-bar { display: none; } embed, iframe { height: 100vh; } }
  </style>
</head>
<body>
  <div class="file-bar">
    <button type="button" onclick="window.close()">Close</button>
  </div>
  ${
    isImage
      ? `<img src="${src}" alt="" />`
      : `<embed src="${src}" type="${kind || "application/pdf"}" />`
  }
</body>
</html>`);
  popup.document.close();

  const runPrint = () => {
    try {
      popup.focus();
      popup.print();
    } catch {
      /* ignore blocked print */
    }
  };

  popup.addEventListener("afterprint", () => {
    if (objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
  });

  if (isImage) {
    const img = popup.document.querySelector("img");
    if (img?.complete) runPrint();
    else img?.addEventListener("load", runPrint, { once: true });
    popup.setTimeout(runPrint, 800);
    return true;
  }
  popup.setTimeout(runPrint, 500);
  return true;
}

function fileHrefToObjectUrl(href, type = "") {
  if (!href.startsWith("data:")) return href;
  const comma = href.indexOf(",");
  if (comma < 0) return href;
  const header = href.slice(0, comma);
  const payload = href.slice(comma + 1);
  const mime = type || header.match(/^data:([^;,]+)/i)?.[1] || "application/octet-stream";
  try {
    const binary = /;base64/i.test(header) ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return href;
  }
}
