import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listOrders, patchOrder } from "./store.mjs";
import {
  DELIVERY_OUTLETS,
  normalizeStorePins,
  outletForPin,
  partnerCoversPin,
} from "../src/deliveryOutlets.js";
import {
  clampSplitPercent,
  defaultPartnerPercentFor,
  resplitOrder,
} from "../src/paymentSplit.js";
import { partnerAppKind } from "../src/partnerApp.js";
import {
  deliveryRecordIsFresh,
  isDeliveryPartner,
  isPharmacyStorePartner,
} from "../src/partnerRetention.js";
import { pharmacyReturnKey } from "../src/pharmacyTrack.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "partners.json");
const tokenFile = path.join(root, "data", "partner-tokens.json");
const tokens = new Map();

function hydratePartnerTokens() {
  try {
    const parsed = JSON.parse(readFileSync(tokenFile, "utf8"));
    for (const [token, id] of Object.entries(parsed && typeof parsed === "object" ? parsed : {})) {
      if (token && id) tokens.set(String(token), String(id));
    }
  } catch {
    /* first run or empty file */
  }
}

function persistPartnerTokens() {
  try {
    mkdirSync(path.dirname(tokenFile), { recursive: true });
    writeFileSync(tokenFile, `${JSON.stringify(Object.fromEntries(tokens), null, 2)}\n`);
  } catch {
    /* keep serving even if the token cache cannot be written */
  }
}

hydratePartnerTokens();

const KIND_OPTIONS = [
  "medicine",
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "psychologist",
  "doctor",
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
    id: "P-HC-02",
    name: "Ankit Sharma",
    role: "Home Care nurse",
    kinds: ["homecare"],
    mobile: "9654222914",
    outletId: "MH-OUT-SD",
  },
  {
    id: "P-HC-03",
    name: "Kavita Rai",
    role: "Home Care caregiver",
    kinds: ["homecare"],
    mobile: "9654222924",
    outletId: "MH-OUT-CD",
  },
  {
    id: "P-HC-04",
    name: "Rohan Malhotra",
    role: "Physiotherapist",
    kinds: ["homecare"],
    mobile: "9654222934",
    outletId: "MH-OUT-WD",
  },
  {
    id: "P-HC-05",
    name: "Meena Joshi",
    role: "Home Care nurse",
    kinds: ["homecare"],
    mobile: "9654222944",
    outletId: "MH-OUT-ND",
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

function normalizePartnerPercent(value, kinds) {
  const clamped = clampSplitPercent(value);
  if (clamped != null) return clamped;
  return defaultPartnerPercentFor(kinds?.[0] || "medicine");
}

function sanitizePartner(row) {
  if (!row || typeof row !== "object") return null;
  const id = clipText(row.id, 40);
  const name = clipText(row.name, 80);
  if (!id || !name) return null;
  const loginId = normalizePartnerLoginId(row.loginId);
  const kinds = normalizeKinds(row.kinds);
  const { pin, password, ...rest } = row;
  return {
    ...rest,
    id,
    name,
    role: clipText(row.role, 80) || "Partner",
    kinds,
    mobile: String(row.mobile || "").replace(/\D/g, "").slice(0, 10),
    outletId: clipText(row.outletId, 40),
    address: clipText(row.address, 160),
    pins: normalizeStorePins(row.pins.length ? row.pins : row.pin || row.pinCode),
    loginId,
    passwordHash: String(row.passwordHash || "").trim(),
    partnerPercent: normalizePartnerPercent(row.partnerPercent, kinds),
  };
}

export function publicPartner(row) {
  if (!row) return null;
  const clean = sanitizePartner(row);
  if (!clean) return null;
  const { passwordHash, pin, ...rest } = clean;
  return {
    ...rest,
    loginId: clean.loginId || "",
    hasLogin: Boolean(clean.loginId && passwordHash),
  };
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
    const cleaned = list.map(sanitizePartner).filter(Boolean);
    return cleaned.length ? cleaned : SEED.map(sanitizePartner);
  } catch {
    return SEED.map(sanitizePartner);
  }
}

async function writePartners(list) {
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
  const wanted = normalizePartnerLoginId(loginId);
  if (!wanted) return null;
  return list.find((row) => normalizePartnerLoginId(row.loginId) === wanted) || null;
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
  persistPartnerTokens();
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

export async function createPartner(body = {}) {
  const name = clipText(body.name, 80);
  if (!name) return { ok: false, error: "Partner name is required." };
  const address = clipText(body.address, 160);
  const pin = String(body.pin || body.pinCode || (Array.isArray(body.pins) ? body.pins[0] : ""))
    .replace(/\D/g, "")
    .slice(0, 6);
  if (!address) return { ok: false, error: "Address is required." };
  if (pin.length !== 6) return { ok: false, error: "A 6-digit PIN is required." };
  const list = await readPartners();
  const id =
    clipText(body.id, 40) ||
    `P-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
  if (list.some((row) => row.id === id)) {
    return { ok: false, error: "A partner with that id already exists." };
  }
  const row = sanitizePartner({
    id,
    name,
    role: body.role,
    kinds: body.kinds,
    mobile: body.mobile,
    outletId: body.outletId,
    address,
    pin,
    pinCode: pin,
    pins: [pin],
    partnerPercent: body.partnerPercent,
  });
  list.push(row);
  await writePartners(list);
  if (body.loginId || body.password) {
    const login = await setPartnerLogin(id, {
      loginId: body.loginId,
      password: body.password,
    });
    if (!login.ok) return login;
    return login;
  }
  return { ok: true, partner: publicPartner(row) };
}

export async function updatePartner(id, body = {}) {
  const list = await readPartners();
  const index = list.findIndex((row) => row.id === id);
  if (index < 0) return { ok: false, error: "Partner not found." };
  const current = list[index];
  const next = sanitizePartner({
    ...current,
    name: body.name != null ? body.name : current.name,
    role: body.role != null ? body.role : current.role,
    kinds: body.kinds != null ? body.kinds : current.kinds,
    mobile: body.mobile != null ? body.mobile : current.mobile,
    outletId: body.outletId != null ? body.outletId : current.outletId,
    pins: body.pins != null ? body.pins : current.pins,
    partnerPercent:
      body.partnerPercent != null ? body.partnerPercent : current.partnerPercent,
    id: current.id,
    loginId: current.loginId,
    passwordHash: current.passwordHash,
  });
  list[index] = next;
  await writePartners(list);
  return { ok: true, partner: publicPartner(next) };
}

export function partnerIdFromToken(token) {
  return tokens.get(String(token || "")) || "";
}

export function orderKind(row) {
  const kind = String(row?.kind || row?.orderType || "").toLowerCase();
  if (kind === "cart") return "medicine";
  if (KIND_OPTIONS.includes(kind)) return kind;
  const service = String(row?.serviceType || "").toLowerCase();
  if (service === "radiology") return "radiology";
  if (service === "lab") return "lab";
  return kind || "medicine";
}

/** Login partners use P-LAB-01 style ids. Catalog brands (lal-pathlabs) are only a preference. */
export function isExclusivePartnerId(id) {
  return /^P-[A-Z0-9]+-\d+/i.test(String(id || "").trim());
}

function isPendingPartnerConfirm(row) {
  const status = String(row?.trackStatus || "").toLowerCase();
  return (
    !row?.partnerConfirmed &&
    (status === "requested" || row?.partnerConfirmStatus === "pending")
  );
}

function isClosedJob(row) {
  const status = String(row?.trackStatus || "").toLowerCase();
  return status === "done" || status === "declined" || Boolean(row?.trackCompleted);
}

export function attachConcernedPharmacy(order, partners = []) {
  if (order?.pharmacyPartnerId) {
    return {
      pharmacyPartnerId: order.pharmacyPartnerId,
      pharmacyPartnerName: order.pharmacyPartnerName || "",
    };
  }
  const concerned = concernedPartnersForOrder(order, partners);
  const store =
    concerned.find((row) => isPharmacyStorePartner(row)) ||
    concerned.find((row) => !isDeliveryPartner(row));
  if (!store) return {};
  return {
    pharmacyPartnerId: store.id,
    pharmacyPartnerName: store.name || "",
  };
}

export function attachDeliveryActor(partner) {
  if (!partner || !isDeliveryPartner(partner)) return {};
  return {
    deliveryPartnerId: partner.id,
    deliveryPartnerName: partner.name || "",
  };
}

export function partnerCanAccessJob(partner, row, now = Date.now()) {
  if (!partner || !row) return false;
  const kind = orderKind(row);
  if (kind !== partnerAppKind(partner)) return false;
  if (kind === "medicine") {
    const pinOk = partnerCoversPin(partner, row.pinCode || row.pin);
    const assignedToMe = Boolean(row.partnerId && row.partnerId === partner.id);
    const pharmacyMine = Boolean(
      row.pharmacyPartnerId && row.pharmacyPartnerId === partner.id
    );
    if (isDeliveryPartner(partner)) {
      const returnOpen =
        pharmacyReturnKey(row) === "return_requested" ||
        pharmacyReturnKey(row) === "return_collected";
      if (returnOpen && pinOk) return true;
      const mine =
        Boolean(row.deliveryPartnerId && row.deliveryPartnerId === partner.id) ||
        assignedToMe;
      if (mine) return deliveryRecordIsFresh(row, now);
      return pinOk && !isClosedJob(row);
    }
    return assignedToMe || pharmacyMine || pinOk;
  }
  if (row.partnerId && row.partnerId === partner.id) return true;
  if (isExclusivePartnerId(row.partnerId) && row.partnerId !== partner.id) return false;
  if (!isPendingPartnerConfirm(row)) return false;
  return true;
}

export function concernedPartnersForOrder(order, partners = []) {
  const kind = orderKind(order);
  const assignedId = String(
    order?.partnerId || order?.preferredPartnerId || ""
  ).trim();
  const list = (Array.isArray(partners) ? partners : []).filter(Boolean);
  const exact = list.filter((row) => row.id === assignedId);
  if (exact.length) return exact;
  const byKind = list.filter((row) => partnerAppKind(row) === kind);
  if (kind === "medicine") {
    const pin = String(order?.pinCode || order?.pin || "").replace(/\D/g, "");
    if (pin.length === 6) {
      const byPin = byKind.filter((row) => partnerCoversPin(row, pin));
      if (byPin.length) return byPin;
    }
    const outletId = String(order?.outletId || "").trim();
    if (outletId) {
      const byOutlet = byKind.filter((row) => row.outletId === outletId);
      if (byOutlet.length) return byOutlet;
    }
  }
  return byKind;
}

export function deliveryPartnersForOrder(order, partners = []) {
  const list = (Array.isArray(partners) ? partners : []).filter((row) =>
    isDeliveryPartner(row)
  );
  const assigned = String(order?.deliveryPartnerId || "").trim();
  if (assigned) {
    const exact = list.filter((row) => row.id === assigned);
    if (exact.length) return exact;
  }
  const pin = String(order?.pinCode || order?.pin || "").replace(/\D/g, "");
  if (pin.length === 6) {
    const byPin = list.filter((row) => partnerCoversPin(row, pin));
    if (byPin.length) return byPin;
  }
  const outletId = String(order?.outletId || "").trim();
  if (outletId) {
    const byOutlet = list.filter((row) => String(row.outletId || "") === outletId);
    if (byOutlet.length) return byOutlet;
  }
  return [];
}

export async function listPartnerJobs(partnerId, token) {
  const allowed = partnerIdFromToken(token);
  if (!allowed || allowed !== partnerId) return null;
  const partner = await findPartner(partnerId);
  if (!partner) return null;
  const orders = await listOrders();
  return orders.filter((row) => partnerCanAccessJob(partner, row));
}

export async function assignPartnerToOrder(orderId, body) {
  const partner = await findPartner(body.partnerId);
  if (!partner) return null;
  const wanted = String(orderId || "");
  const existing = (await listOrders()).find(
    (row) =>
      String(row.id) === wanted ||
      String(row.bookingId) === wanted ||
      String(row.requestId) === wanted
  );
  const patch = {
    partnerId: partner.id,
    partnerName: partner.name,
    partnerMobile: partner.mobile,
    partnerRole: partner.role,
    partnerAssignedAt: Date.now(),
    ...(isPharmacyStorePartner(partner)
      ? {
          pharmacyPartnerId: partner.id,
          pharmacyPartnerName: partner.name,
        }
      : {}),
    ...(isDeliveryPartner(partner) ? attachDeliveryActor(partner) : {}),
  };
  if (existing && !existing.split?.staffSet) {
    patch.split = {
      ...resplitOrder(existing, { partnerPercent: partner.partnerPercent }),
      staffSet: false,
    };
  }
  return patchOrder(orderId, patch);
}
