import { apiFetch } from "./apiBase.js";
import { readPrescriptionDraft } from "./prescriptionDraft.js";
import { canonicalizePrescription } from "./rxCanonicalize.js";

export const PRESCRIPTION_PARSE_KEY = "mediHomePrescriptionParse";
export const PRESCRIPTION_PARSE_EVENT = "mediHomePrescriptionParse";

export function readPrescriptionParse(store) {
  try {
    const raw = (store || globalThis.localStorage)?.getItem?.(PRESCRIPTION_PARSE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return canonicalizePrescription(parsed);
  } catch {
    return null;
  }
}

export function writePrescriptionParse(result, store) {
  try {
    (store || globalThis.localStorage)?.setItem?.(
      PRESCRIPTION_PARSE_KEY,
      JSON.stringify({
        ...result,
        savedAt: new Date().toISOString(),
      })
    );
    globalThis.dispatchEvent?.(new Event(PRESCRIPTION_PARSE_EVENT));
  } catch {
    /* ignore */
  }
}

export function clearPrescriptionParse(store) {
  try {
    (store || globalThis.localStorage)?.removeItem?.(PRESCRIPTION_PARSE_KEY);
    globalThis.dispatchEvent?.(new Event(PRESCRIPTION_PARSE_EVENT));
  } catch {
    /* ignore */
  }
}

export async function digitizePrescription(draft = readPrescriptionDraft()) {
  if (!draft?.fileName) {
    throw new Error("Upload a prescription on Home first.");
  }
  const res = await apiFetch("/api/prescription/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: draft.fileName,
      fileType: draft.fileType,
      fileData: draft.fileData || "",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not digitize this prescription.");
  }
  const result = {
    ...data,
    fileName: draft.fileName,
    sourceSavedAt: draft.savedAt || "",
  };
  writePrescriptionParse(result);
  return result;
}
