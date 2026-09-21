import { RX_MEDICINES, RX_TESTS } from "./data/rxMedicalLexicon.js";

const FORM_PREFIX =
  /^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syr(?:up)?|inj(?:ection)?|oint(?:ment)?|drops?|sachet|susp(?:ension)?)\s+/i;

const JUNK_NAME =
  /^(?:unknown(?:\s+(?:medicine|test))?|medicine|test|adv|advice|investigation|investigations|rx|prescription|nil|none)$/i;

export function foldRx(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function handwritingFold(value) {
  return foldRx(value)
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/5/g, "s")
    .replace(/8/g, "b")
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/(.)\1{2,}/g, "$1$1");
}

function stripFormPrefix(value) {
  return String(value || "").replace(FORM_PREFIX, "").trim();
}

function tokens(value) {
  return foldRx(value)
    .split(" ")
    .filter((part) => part.length > 1);
}

function levenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const rows = s.length + 1;
  const cols = t.length + 1;
  const prev = new Array(cols);
  const cur = new Array(cols);
  for (let j = 0; j < cols; j += 1) prev[j] = j;
  for (let i = 1; i < rows; i += 1) {
    cur[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j += 1) prev[j] = cur[j];
  }
  return prev[t.length];
}

function editLimit(query, candidate) {
  const n = Math.min(query.length, candidate.length);
  if (n <= 4) return 0;
  if (n <= 6) return 1;
  if (n <= 10) return 2;
  return Math.min(3, Math.ceil(n * 0.2));
}

function firstToken(value) {
  return tokens(value)[0] || "";
}

function scoreAlias(query, alias, hwQuery) {
  const a = foldRx(alias);
  const q = foldRx(query);
  const hwA = handwritingFold(alias);
  if (!q || !a) return 0;
  if (q === a || hwQuery === hwA) return 100;
  if (a.length >= 4 && (q.startsWith(a) || a.startsWith(q))) return 92;
  if (a.length >= 5 && (q.includes(a) || a.includes(q))) {
    const shorter = Math.min(q.length, a.length);
    const longer = Math.max(q.length, a.length);
    if (shorter / longer >= 0.72) return 88;
  }
  const dist = Math.min(levenshtein(q, a), levenshtein(hwQuery, hwA));
  const limit = editLimit(q, a);
  if (limit && dist <= limit) return Math.max(70, 96 - dist * 8);
  return 0;
}

function stripStrength(value) {
  return String(value || "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%)\b/gi, " ")
    .replace(/\b\d{2,4}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bestMedicine(rawName) {
  const cleaned = stripStrength(stripFormPrefix(rawName));
  const query = foldRx(cleaned);
  const hwQuery = handwritingFold(cleaned);
  if (!query || query.length < 3) return null;
  let best = null;
  let bestScore = 0;
  let bestKind = "brand";
  for (const row of RX_MEDICINES) {
    const options = [
      { alias: row.brand, kind: "brand" },
      { alias: row.salt, kind: "salt" },
      ...(row.aliases || []).map((alias) => ({
        alias,
        kind: foldRx(alias) === foldRx(row.salt) ? "salt" : "brand",
      })),
    ];
    for (const option of options) {
      const score = scoreAlias(query, option.alias, hwQuery);
      if (score > bestScore) {
        bestScore = score;
        best = row;
        bestKind = option.kind;
      }
    }
  }
  if (!best || bestScore < 86) return null;
  const qToken = firstToken(query);
  const nameToken = firstToken(bestKind === "salt" ? best.salt : best.brand);
  const otherToken = firstToken(bestKind === "salt" ? best.brand : best.salt);
  if (
    qToken.length >= 4 &&
    nameToken.length >= 4 &&
    qToken.slice(0, 3) !== nameToken.slice(0, 3) &&
    qToken.slice(0, 3) !== otherToken.slice(0, 3) &&
    bestScore < 96
  ) {
    return null;
  }
  return { row: best, score: bestScore, kind: bestKind };
}

function bestTest(rawName) {
  const query = foldRx(rawName);
  const hwQuery = handwritingFold(rawName);
  if (!query) return null;
  let best = null;
  let bestScore = 0;
  for (const row of RX_TESTS) {
    for (const alias of [row.name, ...(row.aliases || [])]) {
      const folded = foldRx(alias);
      if (folded.length <= 3 && query !== folded) continue;
      const score = scoreAlias(query, alias, hwQuery);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
  }
  if (!best || bestScore < 80) return null;
  return { row: best, score: bestScore };
}

export function splitRxInvestigations(name) {
  return String(name || "")
    .split(/\s*(?:\/|&|,|;|\+|and)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

function inferSalt(written, extra = {}) {
  const blob = `${written} ${extra.instructions || ""} ${extra.notes || ""} ${extra.salt || ""}`;
  const folded = foldRx(blob);
  if (folded.includes("tacrolimus")) return "Tacrolimus";
  if (folded.includes("prednisolone") || folded.includes("wysolone")) return "Prednisolone";
  if (folded.includes("mycophenolate") || folded.includes("cellcept")) return "Mycophenolate mofetil";
  if (folded.includes("glimepiride") || folded.includes("amaryl")) return "Glimepiride";
  if (folded.includes("famotidine") || folded.includes("famocid")) return "Famotidine";
  if (folded.includes("insulin glargine") || folded.includes("lantus")) return "Insulin glargine";
  if (folded.includes("actrapid")) return "Insulin regular";
  const strength = String(extra.strength || "");
  if (/^pan(?!adol)/i.test(written) && /40/.test(strength)) return "Pantoprazole";
  return "";
}

export function canonicalizeMedicineName(rawName, extra = {}) {
  const written = stripFormPrefix(String(rawName || "").trim());
  if (!written || JUNK_NAME.test(written)) {
    return { name: "", verified: false, salt: "", strength: extra.strength || "" };
  }
  const hit = bestMedicine(written);
  if (hit) {
    const strength = String(extra.strength || "").trim() || hit.row.strength || "";
    const name = hit.kind === "salt" ? hit.row.salt : hit.row.brand;
    return {
      name,
      verified: true,
      salt: hit.row.salt,
      form: extra.form || hit.row.form || "",
      strength,
      asWritten: written,
      score: hit.score,
    };
  }
  const salt = inferSalt(written, extra);
  return {
    name: written,
    verified: Boolean(salt),
    salt,
    strength: extra.strength || "",
    asWritten: written,
  };
}

export function canonicalizeTestName(rawName) {
  const written = String(rawName || "").trim();
  if (!written || JUNK_NAME.test(written)) return [];
  const parts = splitRxInvestigations(written);
  const rows = parts.length > 1 ? parts : [written];
  const seen = new Set();
  const out = [];
  for (const part of rows) {
    const hit = bestTest(part);
    if (hit) {
      const key = foldRx(hit.row.name);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: hit.row.name, verified: true, asWritten: part, score: hit.score });
      continue;
    }
    const key = foldRx(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: part.trim(), verified: false, asWritten: part });
  }
  return out;
}

function sameMed(a, b) {
  const left = foldRx(a?.salt || a?.name);
  const right = foldRx(b?.salt || b?.name);
  return Boolean(left) && left === right;
}

function sameTest(a, b) {
  return foldRx(a?.name) === foldRx(b?.name);
}

export function canonicalizePrescription(parsed = {}, ocrParsed = null) {
  const medicines = [];
  const seenMed = new Set();
  const pushMed = (row) => {
    const canon = canonicalizeMedicineName(row?.name, row);
    if (!canon.name) return;
    const key = `${foldRx(canon.salt || canon.name)}|${foldRx(canon.strength)}`;
    if (seenMed.has(key)) return;
    seenMed.add(key);
    medicines.push({
      ...row,
      name: canon.name,
      strength: canon.strength || row?.strength || "",
      form: canon.form || row?.form || "",
      salt: canon.salt || row?.salt || "",
      verified: canon.verified,
      asWritten: canon.asWritten || row?.name || "",
    });
  };

  (parsed.medicines || []).forEach(pushMed);
  (ocrParsed?.medicines || []).forEach((row) => {
    const canon = canonicalizeMedicineName(row?.name, row);
    if (!canon.verified) return;
    if (medicines.some((item) => sameMed(item, canon))) return;
    pushMed(row);
  });

  const tests = [];
  const seenTest = new Set();
  const pushTests = (row, requireVerified = false) => {
    for (const canon of canonicalizeTestName(row?.name)) {
      if (requireVerified && !canon.verified) continue;
      const key = foldRx(canon.name);
      if (!key || seenTest.has(key)) continue;
      seenTest.add(key);
      tests.push({
        ...row,
        name: canon.name,
        verified: canon.verified,
        asWritten: canon.asWritten || row?.name || "",
      });
    }
  };

  (parsed.tests || []).forEach((row) => pushTests(row, false));
  (ocrParsed?.tests || []).forEach((row) => pushTests(row, true));

  medicines.forEach((row, index) => {
    row.id = `med-${index + 1}`;
  });
  tests.forEach((row, index) => {
    row.id = `test-${index + 1}`;
  });

  return {
    ...parsed,
    medicines,
    tests,
  };
}

export function compactLexiconForPrompt() {
  const meds = RX_MEDICINES.map(
    (row) => `${row.brand} (${row.salt}${row.strength ? `, ${row.strength}` : ""})`
  ).join("; ");
  const tests = RX_TESTS.map((row) => row.name).join("; ");
  return { meds, tests };
}

export { sameMed, sameTest };
