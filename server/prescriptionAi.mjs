/**
 * Prescription extraction: Cursor AI vision when CURSOR_API_KEY is set,
 * otherwise built-in OCR so the review page still reads the Rx.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRxText } from "../src/rxTextParse.js";
import { ocrPrescriptionImage } from "./prescriptionOcr.mjs";
import { callCursorVision, cursorConfigured } from "./prescriptionCursor.mjs";
import {
  canonicalizePrescription,
  compactLexiconForPrompt,
} from "../src/rxCanonicalize.js";
import { HANDWRITING_HINTS } from "../src/data/rxMedicalLexicon.js";

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

function buildSystemPrompt() {
  const { meds, tests } = compactLexiconForPrompt();
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
If duration is written as x/7 or x days, put that in duration and durationDays.`;
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
  if (m) return { mime: m[1], base64: m[2], dataUrl: raw };
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw.slice(0, 80)) && raw.length > 80) {
    return { mime: "application/octet-stream", base64: raw.replace(/\s/g, ""), dataUrl: "" };
  }
  return { mime: "", base64: "", dataUrl: raw };
}

function safeJsonParse(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
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

async function tryOcrParsed({ dataUrl, mime, fileName }) {
  if (!mime.startsWith("image/") || !dataUrl) return { parsed: null, text: "" };
  try {
    const text = await ocrPrescriptionImage(dataUrl);
    const parsed = text ? parseRxText(text) : null;
    return { parsed, text };
  } catch {
    return { parsed: null, text: "", fileName };
  }
}

async function ocrExtraction({ dataUrl, mime, fileName }) {
  if (!mime.startsWith("image/")) {
    throw new Error(
      "Photograph the prescription as a JPG or PNG so medicines can be read."
    );
  }
  const { parsed, text } = await tryOcrParsed({ dataUrl, mime, fileName });
  const result = canonicalizePrescription(
    normalizeResult(parsed || {}, { aiMode: "ocr", model: "tesseract" })
  );
  if (!result.medicines.length && !result.tests.length) {
    result.warning = text
      ? "The prescription was scanned, but medicine names were not clear enough to name safely. Try a closer, well-lit photo."
      : "Could not read text from this prescription. Try a closer, well-lit photo.";
    if (text) result.notes = text.slice(0, 600);
  }
  result.fileHint = fileName;
  return result;
}

async function cursorExtraction({ mime, base64, dataUrl, fileName }) {
  const ocr = await tryOcrParsed({ dataUrl, mime, fileName });
  const { text, model } = await callCursorVision({
    mime,
    base64,
    fileName,
    systemPrompt: buildSystemPrompt(),
    ocrHint: ocr.text,
  });
  const parsed = safeJsonParse(text);
  if (!parsed) {
    throw new Error("Cursor AI returned an unreadable prescription response.");
  }
  const ai = normalizeResult(parsed, { aiMode: "cursor", model });
  const ocrNorm = ocr.parsed
    ? normalizeResult(ocr.parsed, { aiMode: "ocr", model: "tesseract" })
    : null;
  return canonicalizePrescription(ai, ocrNorm);
}

export function aiConfigured() {
  loadDotEnv();
  return cursorConfigured();
}

export async function parsePrescriptionPayload({
  fileData = "",
  fileName = "",
  fileType = "",
} = {}) {
  loadDotEnv();
  const { mime, base64, dataUrl } = stripDataUrl(fileData);
  const resolvedMime = mime || fileType || "application/octet-stream";
  const name = String(fileName || "prescription").trim();

  if (!dataUrl) {
    throw new Error(
      "Prescription file data is missing or too large to analyze. Re-upload a smaller image or PDF."
    );
  }

  if (cursorConfigured()) {
    try {
      return await cursorExtraction({
        mime: resolvedMime,
        base64,
        dataUrl,
        fileName: name,
      });
    } catch (error) {
      const fallback = await ocrExtraction({
        dataUrl,
        mime: resolvedMime,
        fileName: name,
      });
      fallback.warning = [error.message, fallback.warning].filter(Boolean).join(" ");
      return fallback;
    }
  }

  return ocrExtraction({
    dataUrl,
    mime: resolvedMime,
    fileName: name,
  });
}
