import {
  prescriptionDraftIsImage,
  prescriptionDraftIsPdf,
  readPrescriptionDraft,
} from "./prescriptionDraft.js";
import { readPrescriptionParse } from "./prescriptionAi.js";

function compactMedicine(med = {}) {
  return {
    id: med.id || "",
    name: med.name || "",
    strength: med.strength || "",
    form: med.form || "",
    salt: med.salt || "",
    duration: med.durationDays || med.duration || "",
    timesPerDay: med.timesPerDay || med.frequency || "",
    timing: med.timing || "",
    quantity: med.quantity || "",
    instructions: med.instructions || "",
    verified: med.verified !== false,
    userCorrected: Boolean(med.userCorrected),
    partnerCorrected: Boolean(med.partnerCorrected),
    partnerCorrectedBy: med.partnerCorrectedBy || "",
    asWritten: med.asWritten || "",
  };
}

function compactTest(test = {}) {
  return {
    id: test.id || "",
    name: test.name || "",
    notes: test.notes || "",
    verified: test.verified !== false,
    asWritten: test.asWritten || "",
  };
}

export function buildDigitalRx(parsed = readPrescriptionParse()) {
  if (!parsed) return null;
  const medicines = (parsed.medicines || []).map(compactMedicine);
  const tests = (parsed.tests || []).map(compactTest);
  if (
    !medicines.length &&
    !tests.length &&
    !parsed.patientName &&
    !parsed.doctorName
  ) {
    return null;
  }
  return {
    patientName: parsed.patientName || "",
    doctorName: parsed.doctorName || "",
    date: parsed.date || "",
    medicines,
    tests,
    notes: parsed.notes || "",
    medicinesConfirmed: Boolean(parsed.medicinesConfirmed),
  };
}

export function buildPartnerRxShare(kind = "") {
  const draft = readPrescriptionDraft();
  const digital = buildDigitalRx();
  if (!draft?.fileName && !digital) return {};
  return {
    prescription: draft?.fileName || "",
    rxShare: {
      fileName: draft?.fileName || "",
      fileType: draft?.fileType || "",
      originalKind: prescriptionDraftIsPdf(draft)
        ? "pdf"
        : prescriptionDraftIsImage(draft)
          ? "image"
          : "",
      originalFile: draft?.fileData || "",
      digital,
      sharedAt: new Date().toISOString(),
      sharedWith: kind || "partner",
    },
  };
}

export function hasPartnerRxShare(record) {
  const share = record?.rxShare;
  if (!share) return Boolean(record?.prescription);
  return Boolean(
    share.originalFile ||
      share.hasOriginal ||
      share.fileName ||
      share.digital?.medicines?.length ||
      share.digital?.tests?.length
  );
}

export function applyPartnerMedicineCorrection(
  order,
  correction = {},
  partner = {},
  now = Date.now()
) {
  const nextName = String(correction?.name || "").trim();
  const id = String(correction?.id || "").trim();
  if (!nextName) return { ok: false, error: "Enter the correct medicine name." };
  if (!id) return { ok: false, error: "Medicine id is required." };
  const share = order?.rxShare && typeof order.rxShare === "object" ? { ...order.rxShare } : {};
  const digital =
    share.digital && typeof share.digital === "object"
      ? { ...share.digital, medicines: [...(share.digital.medicines || [])] }
      : { medicines: [] };
  const index = digital.medicines.findIndex(
    (med) => String(med?.id || "") === id || String(med?.name || "") === id
  );
  if (index < 0) {
    return { ok: false, error: "Medicine not found on this digital prescription." };
  }
  const prev = digital.medicines[index];
  const oldName = String(prev.name || "").trim();
  digital.medicines[index] = {
    ...prev,
    asWritten: prev.asWritten || oldName,
    name: nextName,
    userCorrected: true,
    partnerCorrected: true,
    partnerCorrectedBy: partner?.name || partner?.id || "Partner",
    partnerCorrectedAt: now,
    verified: true,
  };
  share.digital = digital;
  share.partnerCorrectedAt = now;
  const items = Array.isArray(order?.items)
    ? order.items.map((item) => {
        const sameId = String(item?.id || "") === id;
        const sameName = String(item?.name || "").trim() === oldName;
        if (!sameId && !sameName) return item;
        return { ...item, name: nextName, partnerCorrected: true };
      })
    : order?.items;
  return { ok: true, patch: { rxShare: share, items } };
}

export function stripHeavyRx(record) {
  if (!record?.rxShare?.originalFile) return record;
  const nextShare = { ...record.rxShare, hasOriginal: true };
  delete nextShare.originalFile;
  return { ...record, rxShare: nextShare };
}
