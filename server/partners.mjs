import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listOrders, patchOrder } from "./store.mjs";
import { savePartnerUpload } from "./partnerUploads.mjs";
import {
  digitsOnly,
  displayPartnerName,
  kindsFromServices,
  loginIdFromContact,
  needsHomeVisitDocs,
  normalizeEmail,
  roleForPartner,
  uniqueLoginId,
  validatePartnerOnboard,
} from "../src/partnerProfile.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const tokens = new Map();

function partnersPath() {
  return process.env.MEDIHOME_PARTNERS_FILE || path.join(root, "data", "partners.json");
}

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generatePartnerPassword() {
  const bytes = randomBytes(8);
  let out = "Mh";
  for (let i = 0; i < 8; i += 1) out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  return out;
}

const KIND_OPTIONS = [
  "medicine",
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "psychologist",
  "ambulance",
  "stepdown",
];

const SEED = [
  {
    id: "P-MED-01",
    name: "Ravi Kumar",
    role: "Medicine rider",
    kinds: ["medicine"],
    mobile: "9654222901",
    outletId: "MH-OUT-CD",
  },
  {
    id: "P-LAB-01",
    name: "Neha Sharma",
    role: "Phlebotomist",
    kinds: ["lab"],
    mobile: "9654222902",
    outletId: "MH-OUT-CD",
  },
  {
    id: "P-RAD-01",
    name: "Imaging Desk — Green Park",
    role: "Radiology centre",
    kinds: ["radiology"],
    mobile: "9654222903",
    outletId: "MH-OUT-SD",
  },
  {
    id: "P-HC-01",
    name: "Priya Singh",
    role: "Home Care nurse",
    kinds: ["homecare"],
    mobile: "9654222904",
    outletId: "MH-OUT-SD",
  },
  {
    id: "P-PSY-01",
    name: "Dr. Ananya Mehra",
    role: "Psychologist",
    kinds: ["psychologist"],
    mobile: "9654222907",
    outletId: "MH-OUT-SD",
  },
  {
    id: "P-AMB-01",
    name: "Sanjay Ambulance",
    role: "Ambulance operator",
    kinds: ["ambulance"],
    mobile: "9654222905",
    outletId: "MH-OUT-HQ",
  },
  {
    id: "P-SD-01",
    name: "Dwarka Step-Down desk",
    role: "Step-down centre",
    kinds: ["stepdown"],
    mobile: "9654222906",
    outletId: "MH-OUT-DWK",
  },
];

export function normalizePartnerLoginId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function hashPartnerPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(String(password), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPartnerPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(String(password), salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

function clipText(value, max = 80) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function numberOrBlank(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function policeStatus(value) {
  const key = String(value || "").toLowerCase();
  if (key === "verified" || key === "received" || key === "pending") return key;
  return "";
}

function normalizeKinds(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  const kinds = [
    ...new Set(
      list
        .map((row) => String(row || "").toLowerCase().trim())
        .filter((row) => KIND_OPTIONS.includes(row))
    ),
  ];
  return kinds.length ? kinds : ["medicine"];
}

function sanitizePartner(row) {
  if (!row || typeof row !== "object") return null;
  const id = clipText(row.id, 40);
  const contactName = clipText(row.contactName || row.name, 80);
  const businessName = clipText(row.businessName, 80);
  const name = clipText(displayPartnerName({ businessName, contactName, name: row.name }), 80);
  if (!id || !name) return null;
  const loginId = normalizePartnerLoginId(row.loginId);
  const kinds = normalizeKinds(row.kinds);
  const physiotherapy = Boolean(row.physiotherapy);
  return {
    id,
    name,
    businessName,
    contactName: contactName || name,
    role:
      clipText(row.role, 80) ||
      roleForPartner({ kinds, physiotherapy, businessName }),
    kinds,
    physiotherapy,
    mobile: digitsOnly(row.mobile, 10),
    email: normalizeEmail(row.email).slice(0, 80),
    houseNo: clipText(row.houseNo, 40),
    society: clipText(row.society, 80),
    area: clipText(row.area, 80),
    city: clipText(row.city, 80),
    district: clipText(row.district, 80),
    state: clipText(row.state, 80),
    pinCode: digitsOnly(row.pinCode || row.pin, 6),
    nearby: clipText(row.nearby, 80),
    lat: numberOrBlank(row.lat),
    lng: numberOrBlank(row.lng),
    accountName: clipText(row.accountName, 80),
    accountNumber: digitsOnly(row.accountNumber, 18),
    ifsc: clipText(row.ifsc, 11).toUpperCase(),
    aadhaarFile: clipText(row.aadhaarFile, 40),
    policeFile: clipText(row.policeFile, 40),
    policeVerificationStatus: policeStatus(row.policeVerificationStatus),
    outletId: clipText(row.outletId, 40),
    loginId,
    passwordHash: String(row.passwordHash || "").trim(),
    mustChangePassword: Boolean(row.mustChangePassword),
  };
}

export function publicPartner(row) {
  if (!row) return null;
  const clean = sanitizePartner(row);
  if (!clean) return null;
  const { passwordHash, pin, accountNumber, ...rest } = clean;
  const last4 = String(accountNumber || "").slice(-4);
  return {
    ...rest,
    loginId: clean.loginId || "",
    hasLogin: Boolean(clean.loginId && passwordHash),
    hasAadhaar: Boolean(clean.aadhaarFile),
    hasPoliceVerification: Boolean(clean.policeFile),
    accountLast4: last4,
    accountNumber: accountNumber || "",
  };
}

async function ensureFile() {
  const dataFile = partnersPath();
  await mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify({ partners: SEED }, null, 2)}\n`);
  }
}

async function readPartners() {
  await ensureFile();
  const dataFile = partnersPath();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    if (!Array.isArray(parsed?.partners)) return SEED.map(sanitizePartner);
    return parsed.partners.map(sanitizePartner).filter(Boolean);
  } catch {
    return SEED.map(sanitizePartner);
  }
}

async function writePartners(list) {
  const dataFile = partnersPath();
  await mkdir(path.dirname(dataFile), { recursive: true });
  const partners = list.map(sanitizePartner).filter(Boolean);
  await writeFile(dataFile, `${JSON.stringify({ partners }, null, 2)}\n`);
  return partners;
}

export async function listPartners() {
  return (await readPartners()).map(publicPartner);
}

export async function findPartner(id) {
  const list = await readPartners();
  return list.find((row) => row.id === id) || null;
}

function findByLoginId(list, loginId) {
  const raw = String(loginId || "").trim();
  const wanted = normalizePartnerLoginId(raw);
  const mobile = digitsOnly(raw, 10);
  const email = normalizeEmail(raw);
  return (
    list.find((row) => {
      if (wanted && normalizePartnerLoginId(row.loginId) === wanted) return true;
      if (mobile.length === 10 && row.mobile === mobile) return true;
      if (email.includes("@") && normalizeEmail(row.email) === email) return true;
      return false;
    }) || null
  );
}

export async function partnerLogin(loginId, password) {
  const list = await readPartners();
  const partner = findByLoginId(list, loginId);
  const code = String(password || "");
  if (!partner?.loginId || !partner.passwordHash || !verifyPartnerPassword(code, partner.passwordHash)) {
    return null;
  }
  const token = randomBytes(24).toString("hex");
  tokens.set(token, partner.id);
  return { token, partner: publicPartner(partner) };
}

export async function setPartnerLogin(id, { loginId, password } = {}) {
  const list = await readPartners();
  const index = list.findIndex((row) => row.id === id);
  if (index < 0) return { ok: false, error: "Partner not found." };
  const nextId = normalizePartnerLoginId(loginId);
  if (!nextId || nextId.length < 3) {
    return { ok: false, error: "Login ID must be at least 3 characters." };
  }
  if (!/^[a-z0-9._-]{3,40}$/.test(nextId)) {
    return { ok: false, error: "Login ID can use letters, numbers, dot, hyphen, and underscore." };
  }
  const taken = list.find(
    (row, rowIndex) => rowIndex !== index && normalizePartnerLoginId(row.loginId) === nextId
  );
  if (taken) return { ok: false, error: "That login ID is already in use." };
  const secret = String(password || "");
  const current = list[index];
  if (!current.passwordHash && secret.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (secret && secret.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  list[index] = {
    ...current,
    loginId: nextId,
    passwordHash: secret ? hashPartnerPassword(secret) : current.passwordHash,
  };
  await writePartners(list);
  return { ok: true, partner: publicPartner(list[index]) };
}

async function attachUploads(id, body, row) {
  const next = { ...row };
  if (body.aadhaar?.data || body.aadhaar?.dataUrl) {
    const saved = await savePartnerUpload(id, "aadhaar", body.aadhaar);
    if (!saved.ok) return saved;
    next.aadhaarFile = saved.file;
  }
  if (body.policeVerification?.data || body.policeVerification?.dataUrl) {
    const saved = await savePartnerUpload(id, "police", body.policeVerification);
    if (!saved.ok) return saved;
    next.policeFile = saved.file;
    next.policeVerificationStatus = next.policeVerificationStatus || "received";
  }
  return { ok: true, row: next };
}

export async function createPartner(body = {}) {
  const error = validatePartnerOnboard(body);
  if (error) return { ok: false, error };
  const list = await readPartners();
  const id =
    clipText(body.id, 40) ||
    `P-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
  if (list.some((row) => row.id === id)) {
    return { ok: false, error: "A partner with that id already exists." };
  }
  const physiotherapy = Boolean(
    body.physiotherapy || (Array.isArray(body.kinds) && body.kinds.includes("physiotherapy"))
  );
  const kinds = kindsFromServices(body.kinds, physiotherapy);
  const businessName = clipText(body.businessName, 80);
  const contactName = clipText(body.contactName || body.name, 80);
  const mobile = digitsOnly(body.mobile, 10);
  const email = normalizeEmail(body.email);
  const loginId = uniqueLoginId(
    list.map((row) => row.loginId),
    loginIdFromContact(mobile, email)
  );
  if (!loginId) return { ok: false, error: "Login ID could not be created from mobile and email." };
  const password = generatePartnerPassword();
  let row = sanitizePartner({
    id,
    name: displayPartnerName({ businessName, contactName }),
    businessName,
    contactName,
    role: body.role || roleForPartner({ kinds, physiotherapy, businessName }),
    kinds,
    physiotherapy,
    mobile,
    email,
    houseNo: body.houseNo,
    society: body.society,
    area: body.area,
    city: body.city,
    district: body.district,
    state: body.state,
    pinCode: body.pinCode,
    nearby: body.nearby,
    lat: body.lat,
    lng: body.lng,
    accountName: body.accountName,
    accountNumber: body.accountNumber,
    ifsc: body.ifsc,
    policeVerificationStatus: needsHomeVisitDocs(kinds, physiotherapy) ? "received" : "",
    outletId: body.outletId,
    loginId,
    passwordHash: hashPartnerPassword(password),
    mustChangePassword: true,
  });
  const uploaded = await attachUploads(id, body, row);
  if (!uploaded.ok) return uploaded;
  row = sanitizePartner(uploaded.row);
  list.push(row);
  await writePartners(list);
  return { ok: true, partner: publicPartner(row), loginId, password };
}

export async function resetPartnerPassword(id) {
  const list = await readPartners();
  const index = list.findIndex((row) => row.id === id);
  if (index < 0) return { ok: false, error: "Partner not found." };
  const current = list[index];
  let loginId = normalizePartnerLoginId(current.loginId);
  if (!loginId) {
    loginId = uniqueLoginId(
      list.map((row) => row.loginId),
      loginIdFromContact(current.mobile, current.email)
    );
  }
  if (!loginId) {
    return { ok: false, error: "Add A Mobile Number Or Email Before Resetting The Password." };
  }
  const password = generatePartnerPassword();
  list[index] = {
    ...current,
    loginId,
    passwordHash: hashPartnerPassword(password),
    mustChangePassword: true,
  };
  await writePartners(list);
  return { ok: true, partner: publicPartner(list[index]), loginId, password };
}

export async function changePartnerPassword(partnerId, { currentPassword, newPassword } = {}) {
  const list = await readPartners();
  const index = list.findIndex((row) => row.id === partnerId);
  if (index < 0) return { ok: false, error: "Partner not found." };
  const current = list[index];
  if (!verifyPartnerPassword(String(currentPassword || ""), current.passwordHash)) {
    return { ok: false, error: "Current password is incorrect." };
  }
  const next = String(newPassword || "");
  if (next.length < 8) return { ok: false, error: "New password must be at least 8 characters." };
  if (next === String(currentPassword || "")) {
    return { ok: false, error: "Choose a new password that is different from the current one." };
  }
  list[index] = {
    ...current,
    passwordHash: hashPartnerPassword(next),
    mustChangePassword: false,
  };
  await writePartners(list);
  return { ok: true, partner: publicPartner(list[index]) };
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
