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
