import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAddedLabTest } from "../src/labTestSplit.js";
import { clampSplitPercent } from "../src/paymentSplit.js";

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "lab-tests.json");

async function readAdded() {
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return Array.isArray(parsed?.tests) ? parsed.tests : [];
  } catch {
    return [];
  }
}

async function writeAdded(tests) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify({ tests }, null, 2)}\n`);
  return tests;
}

export async function listAddedLabTests() {
  return readAdded();
}

export async function addLabTest(body = {}) {
  const parsed = validateAddedLabTest(body);
  if (!parsed.ok) return parsed;
  const tests = await readAdded();
  const id = `LT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const test = {
    ...parsed.test,
    id,
    code: parsed.test.code || id,
  };
  tests.push(test);
  await writeAdded(tests);
  return { ok: true, test, tests };
}

export async function updateLabTest(id, body = {}) {
  const tests = await readAdded();
  const index = tests.findIndex((row) => row.id === id);
  if (index < 0) return { ok: false, error: "Lab test not found." };
  const current = tests[index];
  const parsed = validateAddedLabTest({
    ...current,
    name: body.name != null ? body.name : current.name,
    price: body.price != null ? body.price : current.price,
    partnerPercent: body.partnerPercent != null ? body.partnerPercent : current.partnerPercent,
    code: current.code,
    labId: current.labId,
  });
  if (!parsed.ok) return parsed;
  const next = {
    ...current,
    ...parsed.test,
    id: current.id,
    hidden: body.hidden != null ? Boolean(body.hidden) : Boolean(current.hidden),
  };
  tests[index] = next;
  await writeAdded(tests);
  return { ok: true, test: next, tests };
}

export async function removeLabTest(id) {
  const tests = await readAdded();
  const next = tests.filter((row) => row.id !== id);
  if (next.length === tests.length) return { ok: false, error: "Lab test not found." };
  await writeAdded(next);
  return { ok: true, tests: next };
}

export async function saveLabPrice(body = {}) {
  const labId = String(body.labId || "").trim();
  const code = String(body.code || body.testId || "").trim();
  if (!labId || !code) return { ok: false, error: "Choose the test to update." };
  const tests = await readAdded();
  const index = tests.findIndex((row) => row.override && row.labId === labId && row.code === code);
  const current = index >= 0 ? tests[index] : {};
  const parsed = validateAddedLabTest({
    name: body.name || current.name || code,
    price: body.price != null ? body.price : current.price,
    partnerPercent: body.partnerPercent != null ? body.partnerPercent : current.partnerPercent,
    code,
    labId,
  });
  if (!parsed.ok) return parsed;
  const id = current.id || `LT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const next = {
    ...parsed.test,
    id,
    code,
    override: true,
    hidden: Boolean(body.hidden),
  };
  if (index >= 0) tests[index] = next;
  else tests.push(next);
  await writeAdded(tests);
  return { ok: true, test: next, tests };
}

export async function updateLabTestSplit(id, body = {}) {
  const partnerPercent = clampSplitPercent(body.partnerPercent);
  if (partnerPercent == null) return { ok: false, error: "Partner split must be between 0 and 100." };
  const tests = await readAdded();
  const index = tests.findIndex((row) => row.id === id);
  if (index < 0) return { ok: false, error: "Lab test not found." };
  const next = { ...tests[index], partnerPercent };
  tests[index] = next;
  await writeAdded(tests);
  return { ok: true, test: next, tests };
}
