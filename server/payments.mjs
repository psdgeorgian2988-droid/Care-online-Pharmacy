import { createHmac, randomBytes } from "node:crypto";
import { publicSplit, settlementBankCredit } from "../src/payeeBank.js";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "payments.json");

function loadDotEnv() {
  try {
    const text = readFileSync(path.join(root, "..", ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index < 1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] == null) process.env[key] = value;
    }
  } catch {
    /* no .env file yet */
  }
}

loadDotEnv();

const KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

export function razorpayEnabled() {
  return Boolean(KEY_ID && KEY_SECRET);
}

export function publicPaymentConfig() {
  return {
    enabled: razorpayEnabled(),
    keyId: razorpayEnabled() ? KEY_ID : "",
    testMode: !razorpayEnabled() || KEY_ID.startsWith("rzp_test_"),
  };
}

async function ensureFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify({ payments: [] }, null, 2)}\n`);
  }
}

async function readStore() {
  await ensureFile();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return { payments: Array.isArray(parsed?.payments) ? parsed.payments : [] };
  } catch {
    return { payments: [] };
  }
}

async function writeStore(store) {
  await ensureFile();
  await writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`);
}

export function stampSettlement(record = {}) {
  const amount = Number(
    record.split?.medihomeCreditRupees ??
      record.split?.platformSettledRupees ??
      record.split?.medihomeAccountRupees ??
      0
  );
  const paid = String(record.status || "") === "paid";
  const split = publicSplit({
    ...(record.split || {}),
    medihomeCreditDest: "settlement_bank",
    medihomeCreditRupees: amount,
  });
  return {
    ...record,
    split,
    settlementBank: {
      ...settlementBankCredit(amount),
      credited: paid,
      creditedAt: paid ? record.paidAt || Date.now() : undefined,
    },
  };
}

export function clientPayment(record) {
  if (!record) return record;
  const stamped = stampSettlement(record);
  return {
    paymentId: stamped.id,
    paymentStatus: stamped.status === "paid" ? "paid" : stamped.status,
    razorpayPaymentId: stamped.razorpayPaymentId || "",
    razorpayOrderId: stamped.razorpayOrderId || "",
    split: publicSplit(stamped.split),
  };
}

export async function savePayment(record) {
  const stamped = stampSettlement(record);
  const store = await readStore();
  const index = store.payments.findIndex((row) => row.id === stamped.id);
  if (index >= 0) store.payments[index] = stamped;
  else store.payments.unshift(stamped);
  await writeStore(store);
  return stamped;
}

export async function findPayment(id) {
  const store = await readStore();
  return store.payments.find((row) => row.id === id) || null;
}

export async function createRazorpayOrder({ amountPaise, receipt, notes, transfers }) {
  const body = {
    amount: amountPaise,
    currency: "INR",
    receipt: String(receipt || "mh").slice(0, 40),
    notes: notes || {},
  };
  if (Array.isArray(transfers) && transfers.length) {
    body.transfers = transfers;
  }
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.description || "Razorpay order failed.");
  }
  return data;
}

export function verifySignature(orderId, paymentId, signature) {
  const expected = createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export function newPaymentId() {
  return "MH-PAY-" + randomBytes(6).toString("hex");
}
