import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listOrders, patchOrder } from "./store.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "partners.json");
const tokens = new Map();

const SEED = [
  {
    id: "P-MED-01",
    name: "Ravi Kumar",
    role: "Medicine rider",
    kinds: ["medicine"],
    mobile: "9654222901",
    pin: "1111",
    outletId: "MH-OUT-CD",
  },
  {
    id: "P-LAB-01",
    name: "Neha Sharma",
    role: "Phlebotomist",
    kinds: ["lab"],
    mobile: "9654222902",
    pin: "1111",
    outletId: "MH-OUT-CD",
  },
  {
    id: "P-RAD-01",
    name: "Imaging Desk — Green Park",
    role: "Radiology centre",
    kinds: ["radiology"],
    mobile: "9654222903",
    pin: "1111",
    outletId: "MH-OUT-SD",
  },
  {
    id: "P-HC-01",
    name: "Priya Singh",
    role: "Home Care nurse",
    kinds: ["homecare"],
    mobile: "9654222904",
    pin: "1111",
    outletId: "MH-OUT-SD",
  },
  {
    id: "P-PSY-01",
    name: "Dr. Ananya Mehra",
    role: "Psychologist",
    kinds: ["psychologist"],
    mobile: "9654222907",
    pin: "1111",
    outletId: "MH-OUT-SD",
  },
  {
    id: "P-AMB-01",
    name: "Sanjay Ambulance",
    role: "Ambulance operator",
    kinds: ["ambulance"],
    mobile: "9654222905",
    pin: "1111",
    outletId: "MH-OUT-HQ",
  },
  {
    id: "P-SD-01",
    name: "Dwarka Step-Down desk",
    role: "Step-down centre",
    kinds: ["stepdown"],
    mobile: "9654222906",
    pin: "1111",
    outletId: "MH-OUT-DWK",
  },
];

function publicPartner(row) {
  if (!row) return null;
  const { pin, ...rest } = row;
  return rest;
}

async function ensureFile() {
  await mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify({ partners: SEED }, null, 2)}\n`);
  }
}

async function readPartners() {
  await ensureFile();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    const list = Array.isArray(parsed?.partners) ? parsed.partners : SEED;
    return list.length ? list : SEED;
  } catch {
    return SEED;
  }
}

export async function listPartners() {
  return (await readPartners()).map(publicPartner);
}

export async function findPartner(id) {
  const list = await readPartners();
  return list.find((row) => row.id === id) || null;
}

export async function partnerLogin(mobile, pin) {
  const list = await readPartners();
  const digits = String(mobile || "").replace(/\D/g, "");
  const code = String(pin || "").trim();
  const partner = list.find(
    (row) => String(row.mobile).replace(/\D/g, "") === digits && String(row.pin) === code
  );
  if (!partner) return null;
  const token = randomBytes(24).toString("hex");
  tokens.set(token, partner.id);
  return { token, partner: publicPartner(partner) };
}

export function partnerIdFromToken(token) {
  return tokens.get(String(token || "")) || "";
}

export async function listPartnerJobs(partnerId, token) {
  const allowed = partnerIdFromToken(token);
  if (!allowed || allowed !== partnerId) return null;
  const partner = await findPartner(partnerId);
  if (!partner) return null;
  const orders = await listOrders();
  return orders.filter((row) => row.partnerId === partnerId);
}

export async function assignPartnerToOrder(orderId, body) {
  const partner = await findPartner(body.partnerId);
  if (!partner) return null;
  return patchOrder(orderId, {
    partnerId: partner.id,
    partnerName: partner.name,
    partnerMobile: partner.mobile,
    partnerRole: partner.role,
    partnerAssignedAt: Date.now(),
  });
}
