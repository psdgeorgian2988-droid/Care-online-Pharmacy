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

function reportRowFromFile(order, file, { orderId, index, latest }) {
  const uploaded = Number(file.uploadedAt) || Number(order.reportUploadedAt) || Number(order.updatedAt) || Date.now();
  const fileName = clip(file.fileName, 160);
  const fileData = String(file.fileData || "").slice(0, FILE_LIMIT);
  return {
    id: latest ? `ord-${orderId}` : `ord-${orderId}-${index + 1}`,
    orderId,
    partnerId: clip(order.partnerId, 40),
    kind: clip(order.kind || order.orderType || "lab", 40) || "lab",
    testName: clip(file.testName || order.reportTestName || order.testName || "Report", 120),
    patientName: clip(order.patientName || order.name, 80),
    mobile: mobileOf(order.mobile || order.patientMobile || order.phone),
    email: emailOf(order.email || order.mailId || order.customerEmail),
    date: new Date(uploaded).toISOString().slice(0, 10),
    fileName: fileName || "report",
    fileType: clip(file.fileType, 80),
    fileData,
    notes: clip(file.notes || order.reportNotes, 400),
    results: latest && Array.isArray(order.reportResults) ? order.reportResults.slice(0, 40) : [],
    accessionNo: clip(order.accessionNo, 40),
    source: "order",
    updatedAt: uploaded,
  };
}

export function reportFromOrder(order = {}) {
  const rows = reportsFromOrder(order);
  return rows.length ? rows[rows.length - 1] : null;
}

export function reportsFromOrder(order = {}) {
  const orderId = clip(order.id || order.bookingId || order.requestId, 40);
  if (!orderId) return [];
  const listed = Array.isArray(order.reportFiles) ? order.reportFiles : [];
  const files = listed
    .map((row) => ({
      fileName: row?.fileName,
      fileType: row?.fileType,
      fileData: row?.fileData,
      testName: row?.testName,
      notes: row?.notes,
      uploadedAt: row?.uploadedAt,
    }))
    .filter((row) => clip(row.fileName, 160) || String(row.fileData || "").trim());
  const source = files.length
    ? files.slice(0, 4)
    : clip(order.reportFileName, 160) || String(order.reportFileData || "").trim()
      ? [
          {
            fileName: order.reportFileName,
            fileType: order.reportFileType,
            fileData: order.reportFileData,
            testName: order.reportTestName || order.testName,
            notes: order.reportNotes,
            uploadedAt: order.reportUploadedAt || order.updatedAt,
          },
        ]
      : [];
  return source.map((file, index) =>
    reportRowFromFile(order, file, { orderId, index, latest: index === source.length - 1 })
  );
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
  const rows = reportsFromOrder(order);
  if (!rows.length) return null;
  const reports = await readReports();
  const orderId = rows[0].orderId;
  const kept = reports.filter((row) => row.orderId !== orderId && !rows.some((next) => next.id === row.id));
  await writeReports([...rows, ...kept]);
  return publicReport(rows[rows.length - 1]);
}

async function syncOrders() {
  const reports = await readReports();
  const known = new Set(reports.map((row) => row.orderId));
  let changed = false;
  for (const order of await listOrders()) {
    const rows = reportsFromOrder(order);
    if (!rows.length || known.has(rows[0].orderId)) continue;
    reports.unshift(...rows);
    known.add(rows[0].orderId);
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
