import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "customer-notifications.json");

function last10(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function orderIdOf(order) {
  return String(order?.bookingId || order?.id || order?.requestId || "").trim();
}

async function ensureFile() {
  await mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify({ notifications: [] }, null, 2)}\n`);
  }
}

async function readStore() {
  await ensureFile();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return {
      notifications: Array.isArray(parsed?.notifications) ? parsed.notifications : [],
    };
  } catch {
    return { notifications: [] };
  }
}

async function writeStore(store) {
  await ensureFile();
  await writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`);
}

export function alreadyNotifiedCustomer(list, mobile, orderId, type) {
  return (list || []).some(
    (row) =>
      last10(row.mobile) === last10(mobile) &&
      String(row.orderId) === String(orderId) &&
      String(row.type || "") === String(type || "") &&
      !row.readAt
  );
}

export function alreadyNotifiedCustomerType(list, mobile, orderId, type) {
  return (list || []).some(
    (row) =>
      last10(row.mobile) === last10(mobile) &&
      String(row.orderId) === String(orderId) &&
      String(row.type || "") === String(type || "")
  );
}

export function diagnosticReportTestName(order) {
  const named = String(order?.reportTestName || "").trim();
  if (named) return named;
  const tests = Array.isArray(order?.tests)
    ? order.tests.map((row) => row?.name).filter(Boolean).join(", ")
    : "";
  return tests || "Diagnostic report";
}

export function shouldNotifyCustomerReportReady(existing, updated) {
  if (!updated) return false;
  const kind = String(
    updated.kind || updated.orderType || updated.serviceType || ""
  ).toLowerCase();
  if (kind !== "lab" && kind !== "radiology") return false;
  const nowReady = String(updated.trackStatus || "").toLowerCase() === "report_ready";
  const wasReady = String(existing?.trackStatus || "").toLowerCase() === "report_ready";
  const nowFile = Boolean(updated.reportFileData);
  const wasFile = Boolean(existing?.reportFileData);
  return (nowReady && !wasReady) || (nowFile && !wasFile);
}

export async function notifyCustomerRefund(order) {
  const mobile = last10(order?.mobile || order?.mobileNumber);
  const orderId = orderIdOf(order);
  const status = String(order?.refundStatus || "").toLowerCase();
  if (!mobile || mobile.length !== 10 || !orderId || !status) return null;
  const type = `refund_${status}`;
  const store = await readStore();
  if (alreadyNotifiedCustomer(store.notifications, mobile, orderId, type)) {
    return null;
  }
  const titles = {
    pending: "Refund pending",
    processing: "Refund processing",
    refunded: "Refund completed",
    rejected: "Refund declined",
  };
  const row = {
    id: `CN-${Date.now().toString(36)}-${mobile.slice(-4)}`,
    mobile,
    orderId,
    kind: "medicine",
    type,
    title: titles[status] || "Refund update",
    body: [`#${orderId}`, order?.refundNote || ""].filter(Boolean).join(" · "),
    createdAt: Date.now(),
    readAt: null,
  };
  store.notifications.unshift(row);
  await writeStore(store);
  return row;
}

export async function notifyCustomerStepdownDecision(order) {
  const mobile = last10(order?.mobile || order?.mobileNumber);
  const orderId = orderIdOf(order);
  const decision =
    String(order?.partnerConfirmStatus || "").toLowerCase() === "accepted" ||
    order?.partnerConfirmed === true
      ? "confirmed"
      : String(order?.partnerConfirmStatus || "").toLowerCase() === "declined"
        ? "unavailable"
        : "";
  if (!mobile || mobile.length !== 10 || !orderId || !decision) return null;
  const type = `stepdown_${decision}`;
  const store = await readStore();
  const already = store.notifications.some(
    (row) =>
      last10(row.mobile) === mobile &&
      String(row.orderId) === String(orderId) &&
      String(row.type || "") === type
  );
  if (already) return null;
  const row = {
    id: `CN-${Date.now().toString(36)}-${mobile.slice(-4)}`,
    mobile,
    orderId,
    kind: "stepdown",
    type,
    title: decision === "confirmed" ? "Step-down booking confirmed" : "Step-down centre not available",
    body:
      decision === "confirmed"
        ? [`#${orderId}`, "Your recovery stay is confirmed.", stepdownInchargeLine(order)]
            .filter(Boolean)
            .join(" · ")
        : `#${orderId} · The centre marked this booking Not Available.`,
    createdAt: Date.now(),
    readAt: null,
  };
  store.notifications.unshift(row);
  await writeStore(store);
  return row;
}

export function stepdownInchargeLine(order) {
  const name = String(order?.inchargeName || order?.agentName || "").trim();
  const mobile = last10(order?.inchargeMobile || order?.agentMobile);
  if (!name || mobile.length !== 10) return "";
  return `${name} · ${mobile}`;
}

export async function notifyCustomerStepdownAccount(order) {
  const mobile = last10(order?.mobile || order?.mobileNumber);
  const orderId = orderIdOf(order);
  const accountId = String(order?.patientAccountId || "").trim();
  if (!mobile || mobile.length !== 10 || !orderId || !accountId) return null;
  const type = "stepdown_account";
  const store = await readStore();
  const already = store.notifications.some(
    (row) =>
      last10(row.mobile) === mobile &&
      String(row.orderId) === String(orderId) &&
      String(row.type || "") === type
  );
  if (already) return null;
  const incharge = stepdownInchargeLine(order);
  const row = {
    id: `CN-${Date.now().toString(36)}-${mobile.slice(-4)}`,
    mobile,
    orderId,
    kind: "stepdown",
    type,
    title: "Patient account opened",
    body: [`#${orderId}`, accountId, incharge].filter(Boolean).join(" · "),
    createdAt: Date.now(),
    readAt: null,
  };
  store.notifications.unshift(row);
  await writeStore(store);
  return row;
}

export async function notifyCustomerStepdownCharge(order) {
  const mobile = last10(order?.mobile || order?.mobileNumber);
  const orderId = orderIdOf(order);
  const charges = Array.isArray(order?.stayCharges) ? order.stayCharges : [];
  const last = charges[charges.length - 1];
  if (!mobile || mobile.length !== 10 || !orderId || !last) return null;
  const chargeId = String(last.id || "");
  const type = chargeId ? `stepdown_charge_${chargeId}` : "stepdown_charge";
  const store = await readStore();
  const already = store.notifications.some(
    (row) =>
      last10(row.mobile) === mobile &&
      String(row.orderId) === String(orderId) &&
      String(row.type || "") === type
  );
  if (already) return null;
  const amount = Number(last.amount || 0);
  const row = {
    id: `CN-${Date.now().toString(36)}-${mobile.slice(-4)}`,
    mobile,
    orderId,
    kind: "stepdown",
    type,
    title: "New stay charge added",
    body: [
      `#${orderId}`,
      last.label || last.service || "Charge",
      amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    createdAt: Date.now(),
    readAt: null,
  };
  store.notifications.unshift(row);
  await writeStore(store);
  return row;
}

export async function notifyCustomerStepdownDischarge(order) {
  const mobile = last10(order?.mobile || order?.mobileNumber);
  const orderId = orderIdOf(order);
  if (!mobile || mobile.length !== 10 || !orderId) return null;
  const type = "stepdown_discharged";
  const store = await readStore();
  const already = store.notifications.some(
    (row) =>
      last10(row.mobile) === mobile &&
      String(row.orderId) === String(orderId) &&
      String(row.type || "") === type
  );
  if (already) return null;
  const total = Number(order?.total || 0);
  const method = String(order?.paymentMethod || "").toLowerCase();
  const pay =
    method === "upi"
      ? "UPI"
      : method === "qr"
        ? "QR Code"
        : method === "cod"
          ? "Cash"
          : "";
  const row = {
    id: `CN-${Date.now().toString(36)}-${mobile.slice(-4)}`,
    mobile,
    orderId,
    kind: "stepdown",
    type,
    title: "Back home · complete bill",
    body: [
      `#${orderId}`,
      total > 0 ? `₹${total.toLocaleString("en-IN")}` : "",
      pay ? `Paid by ${pay}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    createdAt: Date.now(),
    readAt: null,
  };
  store.notifications.unshift(row);
  await writeStore(store);
  return row;
}

export async function notifyCustomerReportReady(order) {
  const mobile = last10(order?.mobile || order?.mobileNumber);
  const orderId = orderIdOf(order);
  const kind = String(order?.kind || order?.orderType || order?.serviceType || "lab").toLowerCase();
  const hasReport =
    String(order?.trackStatus || "").toLowerCase() === "report_ready" ||
    Boolean(order?.reportFileData);
  if (!mobile || mobile.length !== 10 || !orderId || !hasReport) return null;
  if (kind !== "lab" && kind !== "radiology") return null;
  const type = "report_ready";
  const store = await readStore();
  if (alreadyNotifiedCustomerType(store.notifications, mobile, orderId, type)) {
    return null;
  }
  const testName = diagnosticReportTestName(order);
  const row = {
    id: `CN-${Date.now().toString(36)}-${mobile.slice(-4)}`,
    mobile,
    orderId,
    kind,
    type,
    title: "Report ready",
    body: [testName, `#${orderId}`].filter(Boolean).join(" · "),
    href: "#reports",
    createdAt: Date.now(),
    readAt: null,
  };
  store.notifications.unshift(row);
  await writeStore(store);
  return row;
}

export async function notifyCustomerSlotOffer(order) {
  const mobile = last10(order?.mobile || order?.mobileNumber);
  const orderId = orderIdOf(order);
  if (!mobile || mobile.length !== 10 || !orderId) return null;
  const date = String(order?.offeredDate || order?.date || "").trim();
  const slot = String(order?.offeredTimeSlot || order?.timeSlot || "").trim();
  const kind = String(order?.kind || order?.orderType || order?.serviceType || "radiology").toLowerCase();
  const store = await readStore();
  if (alreadyNotifiedCustomer(store.notifications, mobile, orderId, "slot_offer")) {
    return null;
  }
  const row = {
    id: `CN-${Date.now().toString(36)}-${mobile.slice(-4)}`,
    mobile,
    orderId,
    kind,
    type: "slot_offer",
    title:
      kind === "psychologist"
        ? "New psychologist time slot"
        : "New imaging time slot",
    body: [`#${orderId}`, date, slot].filter(Boolean).join(" · "),
    date,
    timeSlot: slot,
    createdAt: Date.now(),
    readAt: null,
  };
  store.notifications.unshift(row);
  await writeStore(store);
  return row;
}

export async function listCustomerNotifications(mobile) {
  const id = last10(mobile);
  if (id.length !== 10) return [];
  const store = await readStore();
  return store.notifications
    .filter((row) => last10(row.mobile) === id)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 40);
}

export async function markCustomerNotificationsRead(mobile, ids = []) {
  const id = last10(mobile);
  if (id.length !== 10) return [];
  const wanted = new Set((Array.isArray(ids) ? ids : []).map(String).filter(Boolean));
  const store = await readStore();
  const now = Date.now();
  store.notifications = store.notifications.map((row) => {
    if (last10(row.mobile) !== id || row.readAt) return row;
    if (wanted.size && !wanted.has(String(row.id))) return row;
    return { ...row, readAt: now };
  });
  await writeStore(store);
  return listCustomerNotifications(id);
}
