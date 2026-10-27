import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listOrders } from "./store.mjs";

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "reports.json");
const FILE_LIMIT = 2_800_000;

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function mobileOf(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function emailOf(value) {
  return String(value || "").trim().toLowerCase().slice(0, 120);
}

export function reportFromOrder(order = {}) {
  const fileName = clip(order.reportFileName, 160);
  const fileData = String(order.reportFileData || "").slice(0, FILE_LIMIT);
  if (!fileName && !fileData) return null;
  const orderId = clip(order.id || order.bookingId || order.requestId, 40);
  if (!orderId) return null;
  const uploaded = Number(order.reportUploadedAt) || Number(order.updatedAt) || Date.now();
  return {
    id: `ord-${orderId}`,
    orderId,
    partnerId: clip(order.partnerId, 40),
    kind: clip(order.kind || order.orderType || "lab", 40) || "lab",
    testName: clip(order.reportTestName || order.testName || "Report", 120),
    patientName: clip(order.patientName || order.name, 80),
    mobile: mobileOf(order.mobile || order.patientMobile || order.phone),
    email: emailOf(order.email || order.mailId || order.customerEmail),
    date: new Date(uploaded).toISOString().slice(0, 10),
    fileName: fileName || "report",
    fileType: clip(order.reportFileType, 80),
    fileData,
    notes: clip(order.reportNotes, 400),
    source: "order",
    updatedAt: uploaded,
  };
}

export function reportMatches(row, { mobile = "", email = "" } = {}) {
  const digits = mobileOf(mobile);
  const mail = emailOf(email);
  if (!digits && !mail) return false;
  const mobileOk = !digits || mobileOf(row?.mobile).includes(digits);
  const emailOk = !mail || emailOf(row?.email).includes(mail);
  return mobileOk && emailOk;
}

export function publicReport(row) {
  if (!row) return null;
  const { fileData, ...rest } = row;
  return { ...rest, hasFile: Boolean(fileData) };
}

async function readReports() {
  await mkdir(path.dirname(dataFile), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return Array.isArray(parsed?.reports) ? parsed.reports : [];
  } catch {
    return [];
  }
}

async function writeReports(reports) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify({ reports }, null, 2)}\n`);
}

export async function saveReportFromOrder(order) {
  const next = reportFromOrder(order);
  if (!next) return null;
  const reports = await readReports();
  const index = reports.findIndex((row) => row.id === next.id || row.orderId === next.orderId);
  if (index >= 0) reports[index] = { ...reports[index], ...next };
  else reports.unshift(next);
  await writeReports(reports);
  return publicReport(next);
}

async function syncOrders() {
  const reports = await readReports();
  const known = new Set(reports.map((row) => row.orderId));
  let changed = false;
  for (const order of await listOrders()) {
    const next = reportFromOrder(order);
    if (!next || known.has(next.orderId)) continue;
    reports.unshift(next);
    known.add(next.orderId);
    changed = true;
  }
  if (changed) await writeReports(reports);
  return reports;
}

export async function searchReports({ partnerId = "", mobile = "", email = "" } = {}) {
  const digits = mobileOf(mobile);
  const mail = emailOf(email);
  if (!digits && !mail) return [];
  const reports = await syncOrders();
  return reports
    .filter((row) => !partnerId || row.partnerId === partnerId)
    .filter((row) => reportMatches(row, { mobile: digits, email: mail }))
    .map(publicReport);
}

export async function readReport(id, { partnerId = "" } = {}) {
  const reports = await syncOrders();
  const row = reports.find((item) => item.id === id);
  if (!row) return null;
  if (partnerId && row.partnerId !== partnerId) return null;
  return row;
}
