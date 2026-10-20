import {
  canonicalizeMedicineName,
  canonicalizePrescription,
  compactLexiconForPrompt,
  foldRx,
} from "./rxCanonicalize.js";
import { rxDoseCode } from "./rxTextParse.js";

function saltOf(row) {
  return foldRx(row?.salt || row?.name);
}

function withCanon(row) {
  if (!row?.name) return null;
  const canon = canonicalizeMedicineName(row.name, row);
  if (!canon.name) return null;
  return {
    ...row,
    name: canon.name,
    strength: canon.strength || row.strength || "",
    form: canon.form || row.form || "",
    salt: canon.salt || row.salt || "",
    verified: Boolean(canon.verified || row.verified),
    asWritten: row.asWritten || canon.asWritten || row.name,
    score: canon.score || row.score || 0,
  };
}

/**
 * Prefer a verified OCR/lexicon hit over an unverified AI guess.
 * Never keep a different drug class when OCR has a stronger verified salt.
 */
export function pickSaferMedicine(aiRow, ocrRow) {
  const ai = withCanon(aiRow);
  const ocr = withCanon(ocrRow);
  if (ai && ocr) {
    if (saltOf(ai) && saltOf(ai) === saltOf(ocr)) {
      return {
        ...ocr,
        ...ai,
        salt: ai.salt || ocr.salt,
        verified: Boolean(ai.verified || ocr.verified),
        duration: ai.duration || ocr.duration || "",
        durationDays: ai.durationDays || ocr.durationDays || ai.duration || ocr.duration || "",
        timesPerDay: ai.timesPerDay || ocr.timesPerDay || "",
        timing: ai.timing || ocr.timing || "",
        frequency: ai.frequency || ocr.frequency || ai.timesPerDay || ocr.timesPerDay || "",
        doseCode: ai.doseCode || ocr.doseCode || "",
      };
    }
    if (ai.verified && ocr.verified && saltOf(ai) !== saltOf(ocr)) {
      return ocr;
    }
    if (!ai.verified && ocr.verified) return ocr;
  }
  return ai || ocr || null;
}

function usedSalt(rows, row) {
  const key = saltOf(row);
  return Boolean(key) && rows.some((item) => saltOf(item) === key);
}

function alreadyHave(rows, row) {
  if (!row?.name) return true;
  if (usedSalt(rows, row)) return true;
  return rows.some((item) => foldRx(item.name) === foldRx(row.name));
}

function pushUnique(rows, row) {
  const picked = withCanon(row) || (row?.name ? row : null);
  if (!picked?.name || alreadyHave(rows, picked)) return;
  rows.push(picked);
}

/**
 * Merge vision-AI extraction with OCR using medical safety rules, then
 * canonicalize names against the Indian OPD lexicon.
 * Pair by salt/name so a short OCR list cannot hide later AI medicines.
 */
export function medicallyValidatePrescription(aiParsed = {}, ocrParsed = null) {
  const aiMeds = Array.isArray(aiParsed?.medicines) ? aiParsed.medicines : [];
  const ocrMeds = Array.isArray(ocrParsed?.medicines) ? ocrParsed.medicines : [];
  const medicines = [];
  const usedAi = new Set();
  const usedOcr = new Set();
  let pairs = 0;

  for (let oi = 0; oi < ocrMeds.length; oi += 1) {
    const ocrCanon = withCanon(ocrMeds[oi]);
    if (!ocrCanon?.name) continue;
    const ocrSalt = saltOf(ocrCanon);
    let found = -1;
    for (let ai = 0; ai < aiMeds.length; ai += 1) {
      if (usedAi.has(ai)) continue;
      const aiCanon = withCanon(aiMeds[ai]);
      if (!aiCanon?.name) continue;
      if (ocrSalt && ocrSalt === saltOf(aiCanon)) {
        found = ai;
        break;
      }
      if (foldRx(aiCanon.name) === foldRx(ocrCanon.name)) {
        found = ai;
        break;
      }
    }
    if (found < 0) continue;
    const picked = pickSaferMedicine(aiMeds[found], ocrMeds[oi]);
    usedAi.add(found);
    usedOcr.add(oi);
    pairs += 1;
    if (picked?.name) pushUnique(medicines, picked);
  }

  for (let oi = 0; oi < ocrMeds.length; oi += 1) {
    if (usedOcr.has(oi)) continue;
    const leftover = withCanon(ocrMeds[oi]);
    if (!leftover?.name) continue;
    if (!leftover.verified && !leftover.form && !leftover.strength) continue;
    pushUnique(medicines, leftover);
  }

  const ocrHasVerified = ocrMeds.some((row) => withCanon(row)?.verified);
  const keepUnpairedAi = pairs > 0 || !ocrHasVerified || aiMeds.length > ocrMeds.length;
  if (keepUnpairedAi) {
    for (let ai = 0; ai < aiMeds.length; ai += 1) {
      if (usedAi.has(ai)) continue;
      pushUnique(medicines, aiMeds[ai]);
    }
  }

  const merged = canonicalizePrescription(
    {
      ...aiParsed,
      medicines,
      tests: [...(aiParsed?.tests || []), ...(ocrParsed?.tests || [])],
    },
    ocrParsed
  );

  merged.medicines = merged.medicines.map((row) => ({
    ...row,
    durationDays: row.durationDays || row.duration || "",
    timesPerDay: row.timesPerDay || row.frequency || row.timing || "",
    doseCode: row.doseCode || rxDoseCode(row),
  }));

  if (!merged.medicines.length && !merged.tests.length && ocrParsed?.notes) {
    merged.notes = merged.notes || ocrParsed.notes;
  }

  return merged;
}

/** Put back candidate medicines/tests a later model call dropped. */
export function restoreDroppedRxItems(primary = {}, fallback = {}) {
  const medicines = [...(primary?.medicines || [])];
  for (const row of fallback?.medicines || []) pushUnique(medicines, row);
  const tests = [...(primary?.tests || [])];
  const seen = new Set(tests.map((row) => foldRx(row?.name)).filter(Boolean));
  for (const row of fallback?.tests || []) {
    const key = foldRx(row?.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tests.push(row);
  }
  return {
    ...fallback,
    ...primary,
    medicines: medicines.map((row, index) => ({ ...row, id: `med-${index + 1}` })),
    tests: tests.map((row, index) => ({ ...row, id: `test-${index + 1}` })),
  };
}

export function medicalValidationPrompt({ ocrText = "", candidate = {}, lexicon } = {}) {
  const { meds, tests } = lexicon || compactLexiconForPrompt();
  return `You are a clinical pharmacist validating a digitized Indian OPD prescription for MediHome.

Rules:
- Keep EVERY medicine and EVERY test from the candidate JSON unless it is clearly the wrong drug class for that line.
- Never drop a line just because it is not in the known list. Unknown brands stay as written.
- OCR is a draft and is often wrong on handwriting. The candidate JSON may also be wrong.
- Identify the actual brand or salt. NEVER substitute a different drug class (do not turn Cefixime into Metformin, Dolo into an antibiotic, Pan into an NSAID).
- If a name is unclear, keep it as written. Empty is better than a popular medicine.
- Keep strength, form, duration and times-a-day only when present in OCR or the candidate.
- Split combined investigations such as "CBC / CRP" into separate tests.
- Read 1-0-1, BD, TDS, OD, HS, SOS and x/7 duration.

Known OPD medicines (spelling help only): ${meds}.
Known tests: ${tests}.

OCR DRAFT:
"""
${String(ocrText || "").slice(0, 8000)}
"""

CANDIDATE JSON:
${JSON.stringify(candidate)}

Return ONLY valid JSON (no markdown) with:
{
  "patientName": "",
  "doctorName": "",
  "date": "",
  "medicines": [{"name":"","strength":"","form":"","duration":"","durationDays":"","timesPerDay":"","timing":"","frequency":"","instructions":"","quantity":""}],
  "tests": [{"name":"","notes":""}],
  "notes": ""
}`;
}
