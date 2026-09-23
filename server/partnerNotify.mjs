import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { concernedPartnersForOrder, listPartners, orderKind } from "./partners.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "partner-notifications.json");

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

function orderIdOf(order) {
  return String(order?.bookingId || order?.id || order?.requestId || "").trim();
}

function kindTitle(kind) {
  switch (kind) {
    case "lab":
      return "New lab booking";
    case "radiology":
      return "New radiology booking";
    case "homecare":
      return "New home-care booking";
    case "vaccination":
      return "New vaccination booking";
    case "psychologist":
      return "New psychologist booking";
    case "doctor":
      return "New doctor appointment";
    case "stepdown":
      return "New step-down booking";
    case "ambulance":
      return "New ambulance request";
    default:
      return "New medicine order";
  }
}

function notificationBody(order, kind) {
  const id = orderIdOf(order);
  const party = String(
    order?.partner || order?.preferredPartner || order?.outletName || ""
  ).trim();
  const pin = String(order?.pinCode || order?.pin || "").replace(/\D/g, "");
  return [`#${id}`, party, pin ? `PIN ${pin}` : ""]
    .filter(Boolean)
    .join(" · ");
}

export function alreadyNotified(list, partnerId, orderId) {
  return (list || []).some(
    (row) =>
      String(row.partnerId) === String(partnerId) &&
      String(row.orderId) === String(orderId)
  );
}

export async function notifyPartnersForOrder(order) {
  const orderId = orderIdOf(order);
  if (!orderId) return [];
  const kind = orderKind(order);
  const partners = concernedPartnersForOrder(order, await listPartners());
  if (!partners.length) return [];
  const store = await readStore();
  const created = [];
  for (const partner of partners) {
    if (alreadyNotified(store.notifications, partner.id, orderId)) continue;
    const row = {
      id: `N-${Date.now().toString(36)}-${partner.id}-${created.length}`,
      partnerId: partner.id,
      orderId,
      kind,
      title: kindTitle(kind),
      body: notificationBody(order, kind),
      createdAt: Date.now(),
      readAt: null,
    };
    store.notifications.unshift(row);
    created.push(row);
  }
  if (created.length) await writeStore(store);
  return created;
}

export async function listPartnerNotifications(partnerId) {
  const id = String(partnerId || "").trim();
  if (!id) return [];
  const store = await readStore();
  return store.notifications
    .filter((row) => row.partnerId === id)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 40);
}

export async function markPartnerNotificationsRead(partnerId, ids = []) {
  const id = String(partnerId || "").trim();
  if (!id) return [];
  const wanted = new Set((Array.isArray(ids) ? ids : []).map(String).filter(Boolean));
  const store = await readStore();
  const now = Date.now();
  store.notifications = store.notifications.map((row) => {
    if (row.partnerId !== id || row.readAt) return row;
    if (wanted.size && !wanted.has(String(row.id))) return row;
    return { ...row, readAt: now };
  });
  await writeStore(store);
  return listPartnerNotifications(id);
}
