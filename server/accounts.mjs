import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orderMobileDigits } from "../src/labCustomerActions.js";
import { isValidEmail, normalizeEmail } from "../src/personFields.js";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const dataFile = path.join(dataDir, "accounts.json");
const homeFile = path.join(os.homedir(), ".medihome", "accounts.json");
const durableFile = "/public/assets/medihome-accounts.json";

export function accountStoreFiles() {
  const extra = String(process.env.MEDIHOME_ACCOUNTS_FILE || "").trim();
  return [...new Set([dataFile, homeFile, durableFile, extra].filter(Boolean))];
}

function mysqlConfigured() {
  return Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
}

let poolPromise = null;
let tableReady = false;

async function mysqlPool() {
  if (!mysqlConfigured()) return null;
  if (!poolPromise) {
    poolPromise = import("mysql2/promise")
      .then((mysql) =>
        mysql.createPool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME,
          connectionLimit: 2,
          enableKeepAlive: true,
        })
      )
      .catch(() => null);
  }
  return poolPromise;
}

async function ensureAccountTable(pool) {
  if (tableReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS medihome_account_store (
      id TINYINT NOT NULL PRIMARY KEY,
      body MEDIUMTEXT NOT NULL
    )`
  );
  tableReady = true;
}

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
  return normalizeEmail(value);
}

export function deviceIdOf(value) {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{20,80}$/.test(id) ? id : "";
}

function trustedDeviceIds(account) {
  return [...new Set((account?.trustedDevices || []).map(deviceIdOf).filter(Boolean))].slice(-12);
}

export function accountDeviceKnown(account, deviceId) {
  const id = deviceIdOf(deviceId);
  return Boolean(id) && trustedDeviceIds(account).includes(id);
}

export function withTrustedDevice(account, deviceId) {
  const id = deviceIdOf(deviceId);
  if (!account || !id) return account;
  const trustedDevices = [...trustedDeviceIds(account).filter((row) => row !== id), id].slice(-12);
  return { ...account, trustedDevices };
}

function isRegisteredAccount(row) {
  return Boolean(row && (row.registered === true || pinOf(row.loginPin)));
}

function accountByMobile(accounts, mobile) {
  return accounts.find(
    (row) =>
      row.mobile === mobile ||
      (row.familyMembers || []).some((member) => mobileOf(member.mobile) === mobile)
  );
}

export function registrationEmailBlock(store, mobile, email) {
  const mail = mailOf(email);
  const number = mobileOf(mobile);
  if (!mail) return "";
  if (!isValidEmail(mail)) return "Enter a valid mail ID.";
  const owner = (store?.accounts || []).find(
    (row) => isRegisteredAccount(row) && mailOf(row.email) === mail && row.mobile !== number
  );
  return owner ? "This mail ID is already registered." : "";
}

export function lookupLoginIdentity(store, { mobile = "", email = "", deviceId = "" } = {}) {
  const number = mobile ? mobileOf(mobile) : "";
  const mail = mailOf(email);
  if (String(mobile || "").trim() && !number) {
    return { ok: false, status: 400, error: "Enter a valid 10-digit mobile number." };
  }
  if (String(email || "").trim() && !isValidEmail(mail)) {
    return { ok: false, status: 400, error: "Enter a valid mail ID." };
  }
  if (!number && !mail) {
    return { ok: false, status: 400, error: "Enter a mobile number or mail ID." };
  }
  const accounts = (store?.accounts || []).filter(isRegisteredAccount);
  const byMobile = number ? accountByMobile(accounts, number) : null;
  const byEmail = mail ? accounts.find((row) => mailOf(row.email) === mail) : null;
  if (byMobile && byEmail && byMobile.mobile !== byEmail.mobile) {
    return {
      ok: true,
      state: "conflict",
      error: "This mobile number and mail ID belong to different accounts.",
    };
  }
  const found = byMobile || byEmail;
  if (!found) return { ok: true, state: "register" };
  return { ok: true, state: "open", account: publicAccount(found) };
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
    .map((row) => `${row.mobile}:${row.loginPin || ""}:${row.updatedAt || ""}:${trustedDeviceIds(row).join(",")}`)
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

async function readMysqlAccounts() {
  const pool = await mysqlPool();
  if (!pool) return null;
  await ensureAccountTable(pool);
  const [rows] = await pool.query("SELECT body FROM medihome_account_store WHERE id = 1");
  if (!rows?.length) return null;
  const parsed = JSON.parse(String(rows[0].body || ""));
  return {
    accounts: Array.isArray(parsed?.accounts) ? parsed.accounts : [],
    removed: removedMobiles(parsed?.removed),
  };
}

async function writeMysqlAccounts(store) {
  const pool = await mysqlPool();
  if (!pool) return false;
  await ensureAccountTable(pool);
  const body = JSON.stringify({
    accounts: store.accounts || [],
    removed: removedMobiles(store.removed),
  });
  await pool.query(
    "INSERT INTO medihome_account_store (id, body) VALUES (1, ?) ON DUPLICATE KEY UPDATE body = VALUES(body)",
    [body]
  );
  return true;
}

async function readStore() {
  const copies = [];
  let missingFile = false;
  for (const file of accountStoreFiles()) {
    const parsed = await readAccountFile(file);
    if (parsed) copies.push(parsed);
    else missingFile = true;
  }
  let databaseCopy = false;
  try {
    const fromDb = await readMysqlAccounts();
    if (fromDb) {
      copies.push(fromDb);
      databaseCopy = true;
    }
  } catch {
    /* a database that is still starting must not hide the file copies */
  }
  if (!copies.length) return { accounts: [], removed: [] };
  const merged = mergeAccountStores(copies);
  const signature = storeSignature(merged);
  const filesDiffer = copies.some((copy) => storeSignature(copy) !== signature);
  if (filesDiffer || missingFile || (mysqlConfigured() && !databaseCopy)) {
    await writeStore(merged);
  }
  return merged;
}

async function writeStore(store) {
  const body = `${JSON.stringify({ accounts: store.accounts || [], removed: removedMobiles(store.removed) }, null, 2)}\n`;
  const signature = storeSignature(store);
  let saved = false;
  for (const file of accountStoreFiles()) {
    try {
      const current = await readAccountFile(file);
      if (current && storeSignature(current) === signature) {
        saved = true;
        continue;
      }
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
      saved = true;
    } catch {
      /* this copy is not writable here; another copy still holds the accounts */
    }
  }
  try {
    if (await writeMysqlAccounts(store)) saved = true;
  } catch {
    /* the file copies remain when the database is not ready */
  }
  if (!saved) {
    const error = new Error("Could not save accounts.");
    error.status = 500;
    throw error;
  }
}

export async function listAccounts() {
  const store = await readStore();
  return store.accounts
    .map(publicAccount)
    .sort((a, b) => a.name.localeCompare(b.name) || a.mobile.localeCompare(b.mobile));
}

export function loginPinFromInput(input) {
  return pinOf(input?.loginPin) || pinOf(input?.password);
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
  const emailBlock = registrationEmailBlock(store, mobile, input?.email || input?.mailId || input?.mail);
  if (emailBlock) return { ok: false, status: 409, error: emailBlock };
  let next = mergeAccount(existing, input, { pin: pin || existing?.loginPin || "" });
  if (input?.registered === true || existing?.registered === true) next.registered = true;
  next = withTrustedDevice(next, input?.deviceId);
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

export async function lookupCustomerLogin(input = {}) {
  const store = await readStore();
  return lookupLoginIdentity(store, input);
}

export async function rememberAccountDevice(mobileValue, deviceId) {
  const mobile = mobileOf(mobileValue);
  const id = deviceIdOf(deviceId);
  if (!mobile || !id) return { ok: false };
  const store = await readStore();
  const index = store.accounts.findIndex(
    (row) =>
      isRegisteredAccount(row) &&
      (row.mobile === mobile ||
        (row.familyMembers || []).some((member) => mobileOf(member.mobile) === mobile))
  );
  if (index < 0) return { ok: false };
  store.accounts[index] = {
    ...withTrustedDevice(store.accounts[index], id),
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return { ok: true, account: publicAccount(store.accounts[index]) };
}

export async function findRegisteredAccountByEmail(email) {
  const mail = mailOf(email);
  if (!isValidEmail(mail)) return null;
  const store = await readStore();
  const row = store.accounts.find((account) => isRegisteredAccount(account) && mailOf(account.email) === mail);
  return row ? publicAccount(row) : null;
}

export async function findCustomerAccount(mobileValue) {
  const mobile = mobileOf(mobileValue);
  if (!mobile) return null;
  const store = await readStore();
  if (isRemovedMobile(store, mobile)) return null;
  const row = store.accounts.find(
    (account) =>
      account.mobile === mobile ||
      (account.familyMembers || []).some((member) => mobileOf(member.mobile) === mobile)
  );
  return row ? publicAccount(row) : null;
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
