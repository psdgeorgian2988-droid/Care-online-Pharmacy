import { DIAGNOSTIC_LABS } from "./diagnosticPartners.js";
import { clampSplitPercent, defaultPartnerPercentFor } from "./paymentSplit.js";

/** Explicit partner % on a test, otherwise Pathcare transfer price ÷ MRP. */
export function partnerPercentOnTest(test) {
  if (!test || typeof test !== "object") return null;
  const explicit = clampSplitPercent(test.partnerPercent);
  if (explicit != null && test.tp == null) return explicit;
  const price = Number(test.price);
  const tp = Number(test.tp);
  if (price > 0 && Number.isFinite(tp) && tp >= 0) {
    return clampSplitPercent((tp / price) * 100);
  }
  return explicit;
}

export function withLabPartnerSplit(test) {
  const partnerPercent = partnerPercentOnTest(test) ?? defaultPartnerPercentFor("lab");
  return { ...test, partnerPercent };
}

function sameTestKey(test, line) {
  const id = String(line?.id || "").trim().toLowerCase();
  const code = String(line?.code || "").trim().toLowerCase();
  const name = String(line?.name || "").trim().toLowerCase();
  const testId = String(test?.id || "").trim().toLowerCase();
  const testCode = String(test?.code || test?.id || "").trim().toLowerCase();
  const testName = String(test?.name || "").trim().toLowerCase();
  if (id && (testId === id || testCode === id)) return true;
  if (code && (testId === code || testCode === code)) return true;
  return Boolean(name && testName === name);
}

export function findCatalogLabTest(labId, line) {
  const wanted = String(labId || line?.partnerId || "").trim().toLowerCase();
  const pools = [];
  if (wanted) {
    const lab = DIAGNOSTIC_LABS.find((row) => row.id.toLowerCase() === wanted);
    if (lab) pools.push(lab);
  }
  for (const lab of DIAGNOSTIC_LABS) {
    if (!pools.includes(lab)) pools.push(lab);
  }
  for (const lab of pools) {
    const hit = (lab.tests || []).find((test) => sameTestKey(test, line));
    if (hit) return hit;
  }
  return null;
}

function findAddedLabTest(added, line) {
  return (Array.isArray(added) ? added : []).find((test) => sameTestKey(test, line)) || null;
}

export function resolveLabLinePercent(line, { labId = "", added = [] } = {}) {
  const addedHit = findAddedLabTest(added, line);
  if (addedHit) {
    const pct = clampSplitPercent(addedHit.partnerPercent);
    if (pct != null) return pct;
  }
  const catalogHit = findCatalogLabTest(labId || line?.partnerId, line);
  if (catalogHit) return partnerPercentOnTest(catalogHit) ?? defaultPartnerPercentFor("lab");
  return partnerPercentOnTest(line);
}

export function stampLabOrderTests(tests, { labId = "", added = [] } = {}) {
  if (!Array.isArray(tests)) return [];
  return tests.map((line) => {
    if (!line || typeof line !== "object") return line;
    const catalogHit = findCatalogLabTest(labId || line.partnerId, line);
    const addedHit = findAddedLabTest(added, line);
    const partnerPercent = resolveLabLinePercent(line, { labId, added });
    const next = { ...line };
    if (partnerPercent != null) next.partnerPercent = partnerPercent;
    if (catalogHit && catalogHit.tp != null && !addedHit) next.tp = catalogHit.tp;
    else delete next.tp;
    return next;
  });
}

export function mergeAddedLabTests(labs, added) {
  const extras = (Array.isArray(added) ? added : []).filter((row) => row && row.name);
  if (!extras.length) return labs;
  return (Array.isArray(labs) ? labs : []).map((lab) => {
    const mine = extras.filter((row) => (row.labId || "others") === lab.id);
    if (!mine.length) return lab;
    const tests = [...(lab.tests || [])];
    for (const row of mine) {
      if (tests.some((test) => sameTestKey(test, row))) continue;
      tests.push(withLabPartnerSplit(row));
    }
    return { ...lab, tests };
  });
}

export function validateAddedLabTest(body = {}) {
  const name = String(body.name || "").replace(/\s+/g, " ").trim();
  const price = Number(body.price);
  const partnerPercent = clampSplitPercent(body.partnerPercent);
  if (!name) return { ok: false, error: "Test name is required." };
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Enter a price greater than 0." };
  if (partnerPercent == null) return { ok: false, error: "Partner split % is required." };
  const code = String(body.code || "").replace(/\s+/g, "").trim().slice(0, 40);
  const labId = String(body.labId || "others").trim() || "others";
  return {
    ok: true,
    test: {
      name: name.slice(0, 120),
      price: Math.round(price * 100) / 100,
      partnerPercent,
      code,
      labId,
    },
  };
}
