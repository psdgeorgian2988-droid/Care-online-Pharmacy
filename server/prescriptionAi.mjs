/**
 * Prescription extraction pipeline:
 * 1) OCR  2) vision AI (when CURSOR_API_KEY is set)  3) medical validation.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRxText } from "../src/rxTextParse.js";
import { ocrPrescriptionImage } from "./prescriptionOcr.mjs";
import { googleVisionConfigured, googleVisionOcr } from "./googleVisionOcr.mjs";
import {
  callCursorMedicalValidation,
  callCursorVision,
  cursorConfigured,
  extractJsonText,
  normalizeImageMime,
} from "./prescriptionCursor.mjs";
import { compactLexiconForPrompt } from "../src/rxCanonicalize.js";
import {
  medicalValidationPrompt,
  medicallyValidatePrescription,
} from "../src/rxMedicalValidate.js";
import { HANDWRITING_HINTS } from "../src/data/rxMedicalLexicon.js";
import { applyRxDetect, rxDetectInstruction } from "../src/rxDetect.js";

const root = path.dirname(fileURLToPath(import.meta.url));

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
      if (key && !String(process.env[key] || "").trim()) process.env[key] = value;
    }
  } catch {
    /* no .env file yet */
  }
}

function buildSystemPrompt(detect = "") {
  const { meds, tests } = compactLexiconForPrompt();
  const focus = rxDetectInstruction(detect);
  return `You are a clinical pharmacist reading an Indian doctor's handwritten or printed prescription for MediHome.

${HANDWRITING_HINTS}

Medical knowledge you MUST use:
- Identify the actual brand or salt. Never substitute a different drug class (do not turn Cefixime into Metformin, Dolo into an antibiotic, etc.).
- If a word is unclear, transcribe the letters you can see. Leave the name empty rather than guessing a popular medicine.
- Keep strength, form, duration and times-a-day only when they are on the Rx.
- Tests: split combined lines such as "CBC / CRP" into separate tests. Use standard names (CBC, CRP, Typhidot IgM, Dengue IgM, LFT, KFT, TSH).

Known Indian OPD medicines (match only if the written name fits): ${meds}.
Known tests: ${tests}.

Return ONLY valid JSON (no markdown) with this shape:
{
  "patientName": "string or empty",
  "doctorName": "string or empty",
  "date": "string or empty",
  "medicines": [
    {
      "name": "brand or salt as written, corrected only for spelling",
      "strength": "e.g. 500 mg",
      "form": "tablet/capsule/syrup/etc",
      "duration": "how long to take, e.g. 5 days / 2 weeks",
      "durationDays": "plain duration, e.g. 5 days",
      "timesPerDay": "how many times in a day, e.g. 2 times a day",
      "timing": "e.g. 1-0-1 after food / morning and night",
      "frequency": "e.g. twice daily",
      "instructions": "any other intake notes",
      "quantity": "if written"
    }
  ],
  "tests": [
    {
      "name": "one lab or radiology test per item",
      "notes": "timing/fasting notes if any"
    }
  ],
  "notes": "general Rx notes"
}
Read Indian charting such as 1-0-1, 1-1-1, BD, TDS, OD, HS, SOS. Convert those into timesPerDay (once/twice/thrice a day) and keep timing as written.
If duration is written as x/7 or x days, put that in duration and durationDays.
${focus}`;
}

function inferTimesPerDay(row) {
  const given = String(row?.timesPerDay || "").trim();
  if (given) return given;
  const blob = `${row?.frequency || ""} ${row?.timing || ""}`.toLowerCase();
  if (/\b(qid|four times|1-1-1-1)\b/.test(blob)) return "4 times a day";
  if (/\b(tds|thrice|three times|1-1-1)\b/.test(blob)) return "3 times a day";
  if (/\b(bd|twice|two times|1-0-1|1-1-0|0-1-1)\b/.test(blob)) return "2 times a day";
  if (/\b(od|once|once daily|1-0-0|0-0-1|hs)\b/.test(blob)) return "1 time a day";
  return String(row?.frequency || "").trim();
}

function stripDataUrl(fileData = "") {
  const raw = String(fileData || "");
  const m = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (m) {
    const mime = normalizeImageMime(m[1]);
    return { mime, base64: m[2], dataUrl: `data:${mime};base64,${m[2]}` };
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw.slice(0, 80)) && raw.length > 80) {
    const base64 = raw.replace(/\s/g, "");
    return {
      mime: "application/octet-stream",
      base64,
      dataUrl: `data:application/octet-stream;base64,${base64}`,
    };
  }
  return { mime: "", base64: "", dataUrl: raw };
}

function safeJsonParse(text) {
  const raw = extractJsonText(text);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeResult(parsed, meta = {}) {
  const medicines = Array.isArray(parsed?.medicines)
    ? parsed.medicines
        .map((row, index) => {
          const name = String(row?.name || "").trim();
          if (!name) return null;
          return {
            id: `med-${index + 1}`,
            name,
            strength: String(row?.strength || "").trim(),
            form: String(row?.form || "").trim(),
            duration: String(row?.duration || row?.durationDays || "").trim(),
            durationDays: String(row?.durationDays || row?.duration || "").trim(),
            timesPerDay: inferTimesPerDay(row),
            timing: String(row?.timing || "").trim(),
            frequency: String(row?.frequency || row?.timesPerDay || "").trim(),
            instructions: String(row?.instructions || "").trim(),
            quantity: String(row?.quantity || "").trim(),
            kind: "medicine",
          };
        })
        .filter(Boolean)
    : [];
  const tests = Array.isArray(parsed?.tests)
    ? parsed.tests
        .map((row, index) => {
          const name = String(row?.name || "").trim();
          if (!name) return null;
          return {
            id: `test-${index + 1}`,
            name,
            notes: String(row?.notes || "").trim(),
            kind: "test",
          };
        })
        .filter(Boolean)
    : [];
  return {
    patientName: String(parsed?.patientName || "").trim(),
    doctorName: String(parsed?.doctorName || "").trim(),
    date: String(parsed?.date || "").trim(),
    medicines,
    tests,
    notes: String(parsed?.notes || "").trim(),
    aiMode: meta.aiMode || "live",
    model: meta.model || "",
    warning: meta.warning || "",
  };
}

async function tryOcrParsed({ dataUrl, mime }) {
  const imageMime = normalizeImageMime(mime);
  if (!imageMime.startsWith("image/") || !dataUrl) return { parsed: null, text: "" };
  let googleError = "";
  if (googleVisionConfigured()) {
    try {
      const text = await googleVisionOcr(dataUrl);
      return { parsed: text ? parseRxText(text) : null, text, provider: "google-cloud-vision" };
    } catch (error) {
      googleError = error?.message || "Google Cloud Vision OCR failed.";
    }
  }
  try {
    const text = await ocrPrescriptionImage(dataUrl);
    const parsed = text ? parseRxText(text) : null;
    return {
      parsed,
      text,
      provider: "tesseract",
      warning: googleError
        ? `Google Cloud Vision OCR could not be used; the local OCR fallback was used. ${googleError}`
        : "",
    };
  } catch {
    return {
      parsed: null,
      text: "",
      provider: "tesseract",
      warning: googleError
        ? `Google Cloud Vision OCR could not be used; the local OCR fallback was unavailable. ${googleError}`
        : "",
    };
  }
}

function localValidated(aiNorm, ocrNorm, meta) {
  const result = medicallyValidatePrescription(aiNorm || {}, ocrNorm);
  result.aiMode = meta.aiMode || result.aiMode || "ocr+validate";
  result.model = meta.model || result.model || "";
  result.ocrProvider = meta.ocrProvider || "tesseract";
  if (meta.warning) result.warning = [result.warning, meta.warning].filter(Boolean).join(" ");
  if (meta.fileHint) result.fileHint = meta.fileHint;
  if (!result.medicines.length && !result.tests.length) {
    result.warning =
      result.warning ||
      (meta.ocrText
        ? "The prescription was scanned, but medicine names were not clear enough to name safely. Try a closer, well-lit photo."
        : "Could not read text from this prescription. Try a closer, well-lit photo.");
    if (meta.ocrText && !result.notes) result.notes = String(meta.ocrText).slice(0, 600);
  }
  return result;
}

async function medicalAiValidate(candidate, ocrText, model, detect = "") {
  const { text, model: usedModel } = await callCursorMedicalValidation({
    prompt: medicalValidationPrompt({
      ocrText,
      candidate,
      lexicon: compactLexiconForPrompt(),
      detect,
    }),
  });
  const parsed = safeJsonParse(text);
  if (!parsed) {
    throw new Error("Medical validation AI returned an unreadable response.");
  }
  return normalizeResult(parsed, {
    aiMode: "ocr+ai+validate",
    model: usedModel || model || "medical-validate",
  });
}

export function aiConfigured() {
  loadDotEnv();
  return cursorConfigured();
}

export async function parsePrescriptionPayload({
  fileData = "",
  fileName = "",
  fileType = "",
  detect = "",
} = {}) {
  loadDotEnv();
  const stripped = stripDataUrl(fileData);
  let mime = normalizeImageMime(stripped.mime || fileType || "application/octet-stream");
  let { base64, dataUrl } = stripped;
  if (base64 && mime.startsWith("image/") && !/^data:image\//i.test(dataUrl)) {
    dataUrl = `data:${mime};base64,${base64}`;
  }
  const name = String(fileName || "prescription").trim();

  if (!dataUrl && !base64) {
    throw new Error(
      "Prescription file data is missing or too large to analyze. Re-upload a smaller image or PDF."
    );
  }

  if (!mime.startsWith("image/")) {
    throw new Error(
      "Photograph the prescription as a JPG or PNG so medicines can be read."
    );
  }

  const ocr = await tryOcrParsed({ dataUrl, mime });
  const ocrNorm = ocr.parsed
    ? normalizeResult(ocr.parsed, { aiMode: "ocr", model: ocr.provider || "tesseract" })
    : { medicines: [], tests: [], notes: ocr.text || "" };

  if (!cursorConfigured()) {
    return applyRxDetect(
      localValidated(ocrNorm, ocrNorm, {
        aiMode: "ocr+validate",
        model: `${ocr.provider || "tesseract"}+lexicon`,
        ocrProvider: ocr.provider,
        warning: ocr.warning,
        ocrText: ocr.text,
        fileHint: name,
      }),
      detect
    );
  }

  let visionNorm = null;
  let visionModel = "";
  let visionError = "";
  try {
    const { text, model } = await callCursorVision({
      mime,
      base64,
      fileName: name,
      systemPrompt: buildSystemPrompt(detect),
      ocrHint: ocr.text,
    });
    const parsed = safeJsonParse(text);
    if (!parsed) {
      throw new Error("Cursor AI returned an unreadable prescription response.");
    }
    visionModel = model;
    visionNorm = normalizeResult(parsed, { aiMode: "cursor", model });
  } catch (error) {
    visionError = error.message || "Vision AI could not read this prescription.";
  }

  const merged = localValidated(visionNorm || ocrNorm, ocrNorm, {
    aiMode: visionNorm ? "ocr+ai" : "ocr+validate",
    model: visionModel || `${ocr.provider || "tesseract"}+lexicon`,
    ocrProvider: ocr.provider,
    warning: [ocr.warning, visionError].filter(Boolean).join(" "),
    ocrText: ocr.text,
    fileHint: name,
  });

  try {
    const validated = await medicalAiValidate(merged, ocr.text, visionModel, detect);
    return applyRxDetect(
      localValidated(validated, ocrNorm, {
        aiMode: "ocr+ai+validate",
        model: validated.model || visionModel,
        ocrProvider: ocr.provider,
        fileHint: name,
        ocrText: ocr.text,
      }),
      detect
    );
  } catch (error) {
    merged.warning = [merged.warning, error.message].filter(Boolean).join(" ");
    merged.aiMode = visionNorm ? "ocr+ai+lexicon" : "ocr+validate";
    return applyRxDetect(merged, detect);
  }
}
