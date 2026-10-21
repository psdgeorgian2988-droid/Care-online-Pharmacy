import {
  canonicalizeMedicineName,
  canonicalizePrescription,
  compactLexiconForPrompt,
  foldRx,
} from "./rxCanonicalize.js";
import { rxDoseCode } from "./rxTextParse.js";
import { rxDetectInstruction } from "./rxDetect.js";

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

/**
 * Merge vision-AI extraction with OCR using medical safety rules, then
 * canonicalize names against the Indian OPD lexicon.
 */
export function medicallyValidatePrescription(aiParsed = {}, ocrParsed = null) {
  const aiMeds = Array.isArray(aiParsed?.medicines) ? aiParsed.medicines : [];
  const ocrMeds = Array.isArray(ocrParsed?.medicines) ? ocrParsed.medicines : [];
  const medicines = [];
  const rejectedAiSalts = new Set();

  const limit = Math.max(aiMeds.length, ocrMeds.length);
  for (let i = 0; i < limit; i += 1) {
    const picked = pickSaferMedicine(aiMeds[i], ocrMeds[i]);
    const aiCanon = withCanon(aiMeds[i]);
    if (picked?.name && aiCanon?.name && saltOf(aiCanon) !== saltOf(picked)) {
      rejectedAiSalts.add(saltOf(aiCanon));
    }
    if (!picked?.name) continue;
    if (usedSalt(medicines, picked)) continue;
    medicines.push(picked);
  }

  for (const row of ocrMeds) {
    const picked = withCanon(row);
    if (!picked?.verified) continue;
    if (usedSalt(medicines, picked)) continue;
    medicines.push(picked);
  }

  for (const row of aiMeds) {
    const picked = withCanon(row);
    if (!picked?.name || usedSalt(medicines, picked)) continue;
    if (rejectedAiSalts.has(saltOf(picked))) continue;
    if (medicines.some((item) => foldRx(item.name) === foldRx(picked.name))) continue;
    medicines.push(picked);
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

export function medicalValidationPrompt({ ocrText = "", candidate = {}, lexicon, detect = "" } = {}) {
  const { meds, tests } = lexicon || compactLexiconForPrompt();
  return `You are a clinical pharmacist validating a digitized Indian OPD prescription for MediHome.

Rules:
- OCR is a draft and is often wrong on handwriting. The candidate JSON may also be wrong.
- Identify the actual brand or salt. NEVER substitute a different drug class (do not turn Cefixime into Metformin, Dolo into an antibiotic, Pan into an NSAID).
- If a name is unclear, keep it as written and leave verified-style guessing out. Empty is better than a popular medicine.
- Keep strength, form, duration and times-a-day only when present in OCR or the candidate.
- Split combined investigations such as "CBC / CRP" into separate tests.
- Read 1-0-1, BD, TDS, OD, HS, SOS and x/7 duration.

Known OPD medicines (match only if the written name fits): ${meds}.
Known tests: ${tests}.
${rxDetectInstruction(detect)}

OCR DRAFT:
"""
${String(ocrText || "").slice(0, 2500)}
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
