import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orderMobileDigits } from "../src/labCustomerActions.js";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const dataFile = path.join(dataDir, "accounts.json");
const homeFile = path.join(os.homedir(), ".medihome", "accounts.json");

function mobileOf(value) {
  return orderMobileDigits({ mobile: value });
}

function pinOf(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 6);
  return /^\d{6}$/.test(digits) ? digits : "";
}

function text(value) {
  return String(value || "").trim();
}

function mailOf(value) {
  return text(value).toLowerCase();
}

function addressOf(source = {}) {
  if (typeof source.address === "string" && source.address.trim() && !source.houseNo) {
    return source.address.trim();
  }
  return [source.houseNo, source.society, source.area, source.nearby, source.city, source.district, source.state, source.pinCode]
    .map(text)
    .filter(Boolean)
    .join(", ");
}

function familyOf(list, accountMobile) {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => ({
      name: text(row?.name),
      relation: text(row?.relation),
      mobile: mobileOf(row?.mobile) || accountMobile,
      email: mailOf(row?.email),
      gender: text(row?.gender),
      dob: text(row?.dob),
      age: text(row?.age),
    }))
    .filter((row) => row.name);
}

export function publicAccount(account) {
  if (!account) return null;
  return {
    mobile: account.mobile,
    name: account.name,
    email: account.email,
    gender: account.gender,
    dob: account.dob,
    age: account.age,
    address: account.address,
    pinCode: account.pinCode || "",
    familyMembers: account.familyMembers || [],
    updatedAt: account.updatedAt || "",
  };
}

function blankAccount(mobile) {
  return {
    mobile,
    name: "",
    email: "",
    gender: "",
    dob: "",
    age: "",
    address: "",
    pinCode: "",
    familyMembers: [],
    loginPin: "",
    updatedAt: "",
  };
}

export function mergeAccount(previous, input, { pin = "", now = new Date() } = {}) {
  const mobile = mobileOf(input?.mobile || previous?.mobile);
  const base = previous ? { ...previous } : blankAccount(mobile);
  const next = { ...base, mobile };
  const name = text(input?.name || input?.patientName || input?.bookedForName);
  const email = mailOf(input?.email || input?.mailId || input?.mail);
  const gender = text(input?.gender);
  const dob = text(input?.dob);
  const age = text(input?.age);
  const address = addressOf(input);
  const pinCode = text(input?.pinCode || input?.pin).replace(/\D/g, "").slice(0, 6);
  const family = familyOf(input?.familyMembers, mobile);
  if (name) next.name = name;
  if (email) next.email = email;
  if (gender) next.gender = gender;
  if (dob) next.dob = dob;
  if (age) next.age = age;
  if (address) next.address = address;
  if (pinCode) next.pinCode = pinCode;
  if (family.length) next.familyMembers = family;
  if (!next.name) next.name = "Customer";
  if (pin) next.loginPin = pin;
  next.updatedAt = now.toISOString();
  return next;
}

function removedMobiles(list) {
  return [...new Set((Array.isArray(list) ? list : []).map(mobileOf).filter(Boolean))];
}

export function isRemovedMobile(store, mobileValue) {
  const mobile = mobileOf(mobileValue);
  if (!mobile) return false;
  return removedMobiles(store?.removed).includes(mobile);
}

export function accountStoreWithout(store, mobileValue) {
  const mobile = mobileOf(mobileValue);
  if (!mobile) return { ok: false, status: 400, error: "Enter a valid 10-digit mobile number." };
  const accounts = (store?.accounts || []).filter((row) => row.mobile !== mobile);
  const removed = removedMobiles([...(store?.removed || []), mobile]);
  return { ok: true, store: { accounts, removed } };
}

function storeSignature(store) {
  const rows = (store?.accounts || [])
    .map((row) => `${row.mobile}:${row.loginPin || ""}:${row.updatedAt || ""}`)
    .sort();
  const removed = removedMobiles(store?.removed).slice().sort();
  return `${rows.join("|")}#${removed.join("|")}`;
}

function combineAccount(previous, next) {
  if (!previous) return next;
  const nextIsNewer = String(next.updatedAt || "") >= String(previous.updatedAt || "");
  const base = nextIsNewer ? { ...previous, ...next } : { ...next, ...previous };
  if (!base.loginPin) base.loginPin = next.loginPin || previous.loginPin || "";
  if (!Array.isArray(base.familyMembers) || !base.familyMembers.length) {
    base.familyMembers = next.familyMembers?.length ? next.familyMembers : previous.familyMembers || [];
  }
  return base;
}

/** Join every saved copy. A wiped file must not erase accounts that another copy still has. */
export function mergeAccountStores(stores) {
  const accounts = new Map();
  const mentioned = new Map();
  for (const store of stores) {
    if (!store) continue;
    const hidden = new Set(removedMobiles(store.removed));
    for (const row of Array.isArray(store.accounts) ? store.accounts : []) {
      const mobile = mobileOf(row?.mobile);
      if (!mobile) continue;
      mentioned.set(mobile, (mentioned.get(mobile) || 0) + 1);
      if (hidden.has(mobile)) continue;
      accounts.set(mobile, combineAccount(accounts.get(mobile), { ...row, mobile }));
    }
    for (const mobile of hidden) {
      if ((store.accounts || []).some((row) => mobileOf(row?.mobile) === mobile)) continue;
      if (!accounts.has(mobile)) mentioned.set(mobile, (mentioned.get(mobile) || 0) + 1);
      const keptElsewhere = stores.some(
        (copy) =>
          copy &&
          copy !== store &&
          (copy.accounts || []).some((row) => mobileOf(row?.mobile) === mobile) &&
          !removedMobiles(copy.removed).includes(mobile)
      );
      if (!keptElsewhere) accounts.delete(mobile);
    }
  }
  return {
    accounts: [...accounts.values()],
    removed: removedMobiles(
      [...mentioned.keys()].filter((mobile) => !accounts.has(mobile) && stores.some((store) => removedMobiles(store?.removed).includes(mobile)))
    ),
  };
}

async function readAccountFile(file) {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return {
      accounts: Array.isArray(parsed?.accounts) ? parsed.accounts : [],
      removed: removedMobiles(parsed?.removed),
    };
  } catch {
    return null;
  }
}

async function readStore() {
  const primary = await readAccountFile(dataFile);
  const backup = await readAccountFile(homeFile);
  const copies = [primary, backup].filter(Boolean);
  if (!copies.length) return { accounts: [], removed: [] };
  const merged = mergeAccountStores(copies);
  if (!primary || storeSignature(primary) !== storeSignature(merged)) {
    await writeStore(merged);
  }
  return merged;
}

async function writeStore(store) {
  const body = `${JSON.stringify({ accounts: store.accounts || [], removed: removedMobiles(store.removed) }, null, 2)}\n`;
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, body);
  try {
    await mkdir(path.dirname(homeFile), { recursive: true });
    await writeFile(homeFile, body);
  } catch {
    /* a read-only home directory still leaves the copy beside the app */
  }
}

export async function listAccounts() {
  const store = await readStore();
  return store.accounts
    .map(publicAccount)
    .sort((a, b) => a.name.localeCompare(b.name) || a.mobile.localeCompare(b.mobile));
}

export function loginPinFromInput(input) {
  return pinOf(input?.loginPin);
}

export function accountMatchesLogin(account, mobileValue, pinValue) {
  const mobile = mobileOf(mobileValue);
  const pin = pinOf(pinValue);
  if (!account || !mobile || !pin || account.loginPin !== pin) return false;
  if (account.mobile === mobile) return true;
  return (account.familyMembers || []).some((member) => mobileOf(member.mobile) === mobile);
}

export async function upsertAccount(input) {
  const mobile = mobileOf(input?.mobile);
  const pin = loginPinFromInput(input);
  if (!mobile) return { ok: false, status: 400, error: "Enter a valid 10-digit mobile number." };
  const store = await readStore();
  if (isRemovedMobile(store, mobile)) {
    store.removed = removedMobiles(store.removed).filter((id) => id !== mobile);
  }
  const index = store.accounts.findIndex((row) => row.mobile === mobile);
  const existing = index >= 0 ? store.accounts[index] : null;
  if (existing?.loginPin && pin && existing.loginPin !== pin) {
    return { ok: false, status: 409, error: "Mobile or PIN does not match this account." };
  }
  if (!existing && !pin) {
    return { ok: false, status: 400, error: "Enter a 6-digit PIN." };
  }
  const next = mergeAccount(existing, input, { pin: pin || existing?.loginPin || "" });
  if (index >= 0) store.accounts[index] = next;
  else store.accounts.push(next);
  await writeStore(store);
  return { ok: true, account: publicAccount(next) };
}

export async function verifyAccountPin(mobileValue, pinValue) {
  const mobile = mobileOf(mobileValue);
  const pin = pinOf(pinValue);
  if (!mobile || !pin) {
    return { ok: false, status: 400, error: "Enter the mobile number and 6-digit PIN." };
  }
  const store = await readStore();
  if (isRemovedMobile(store, mobile)) {
    return { ok: false, status: 404, error: "This mobile number is not registered." };
  }
  const rows = store.accounts.filter(
    (row) =>
      row.mobile === mobile ||
      (row.familyMembers || []).some((member) => mobileOf(member.mobile) === mobile)
  );
  if (!rows.length) {
    return { ok: false, status: 404, error: "This mobile number is not registered." };
  }
  const found = rows.find((row) => accountMatchesLogin(row, mobile, pin));
  if (!found) {
    return { ok: false, status: 401, error: "Mobile or PIN does not match this account." };
  }
  return { ok: true, account: publicAccount(found) };
}

export async function resetAccountPin(mobileValue, pinValue) {
  const mobile = mobileOf(mobileValue);
  const pin = pinOf(pinValue);
  if (!mobile) return { ok: false, status: 400, error: "Enter a valid 10-digit mobile number." };
  if (!pin) return { ok: false, status: 400, error: "Enter a 6-digit password." };
  const store = await readStore();
  const index = store.accounts.findIndex((row) => row.mobile === mobile);
  if (index < 0) return { ok: false, status: 404, error: "No account found for this mobile number." };
  store.accounts[index] = { ...store.accounts[index], loginPin: pin, updatedAt: new Date().toISOString() };
  await writeStore(store);
  return { ok: true, account: publicAccount(store.accounts[index]) };
}

export async function listRemovedMobiles() {
  const store = await readStore();
  return store.removed;
}

export async function removeAccount(mobileValue) {
  const store = await readStore();
  const next = accountStoreWithout(store, mobileValue);
  if (!next.ok) return next;
  await writeStore(next.store);
  return { ok: true, accounts: await listAccounts(), removed: next.store.removed };
}

export async function rememberOrderCustomers(orders = []) {
  const store = await readStore();
  let changed = false;
  for (const order of orders) {
    const mobile = orderMobileDigits(order);
    if (!mobile || isRemovedMobile(store, mobile)) continue;
    const index = store.accounts.findIndex((row) => row.mobile === mobile);
    const existing = index >= 0 ? store.accounts[index] : null;
    const next = mergeAccount(existing, {
      mobile,
      name: existing?.name && existing.name !== "Customer" ? "" : (order.patientName || order.bookedForName || order.name),
      email: existing?.email ? "" : (order.email || order.mailId || ""),
      gender: existing?.gender ? "" : order.gender,
      dob: existing?.dob ? "" : order.dob,
      age: existing?.age ? "" : order.age,
      address: existing?.address ? "" : (order.address || order.deliveryAddress || ""),
      pinCode: existing?.pinCode ? "" : (order.pinCode || order.pin || ""),
    }, { pin: existing?.loginPin || "" });
    if (!existing) {
      store.accounts.push(next);
      changed = true;
    } else if (
      next.name !== existing.name ||
      next.email !== existing.email ||
      next.address !== existing.address ||
      next.gender !== existing.gender ||
      next.dob !== existing.dob ||
      next.age !== existing.age ||
      next.pinCode !== existing.pinCode
    ) {
      store.accounts[index] = next;
      changed = true;
    }
  }
  if (changed) await writeStore(store);
  return listAccounts();
}
