import { DIAGNOSTIC_LABS, IMAGING_CENTRES } from "./diagnosticPartners.js";

const RADIOLOGY_RE = /\b(?:mri|ct scan|ct|usg|ultrasound|x-?\s*ray|mammog\w*|doppler)\b/i;

export function normalizeRxDetect(value) {
  const key = String(value || "").trim().toLowerCase();
  if (
    key === "medicine" ||
    key === "lab" ||
    key === "labs" ||
    key === "radiology" ||
    key === "stepdown" ||
    key === "vaccination"
  ) {
    return key;
  }
  return "";
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function catalogScore(query, partners) {
  const q = norm(query);
  if (!q) return 0;
  let best = 0;
  for (const partner of partners) {
    for (const test of partner.tests || []) {
      for (const label of [test.name, test.id]) {
        const name = norm(label);
        if (!name) continue;
        if (q === name) return 100;
        if (q.length >= 3 && name.includes(q)) best = Math.max(best, 86);
        if (name.length >= 4 && q.includes(name)) best = Math.max(best, 80);
      }
    }
  }
  return best;
}

/** Laboratory test or radiology study, based on the MediHome catalogues. */
export function testServiceKind(name) {
  const lab = catalogScore(name, DIAGNOSTIC_LABS);
  const radiology = catalogScore(name, IMAGING_CENTRES);
  if (radiology >= 60 && radiology > lab) return "radiology";
  if (lab >= 60) return "lab";
  if (RADIOLOGY_RE.test(String(name || ""))) return "radiology";
  return "lab";
}

export function rxDetectInstruction(detect) {
  const mode = normalizeRxDetect(detect);
  if (mode === "medicine") {
    return "This upload is for the medicine section. Return medicines only. Set tests to an empty array.";
  }
  if (mode === "lab") {
    return "This upload is for laboratory tests. Return laboratory tests only, such as blood, urine, stool and profiles. Do not return medicines. Do not return radiology or imaging studies. Set medicines to an empty array.";
  }
  if (mode === "radiology") {
    return "This upload is for radiology. Return imaging studies only, such as MRI, CT, ultrasound, X-ray, mammography and Doppler. Do not return medicines. Do not return laboratory tests. Set medicines to an empty array.";
  }
  if (mode === "labs") {
    return "This upload is for the labs section. Return laboratory tests and radiology studies. Do not return medicines. Set medicines to an empty array.";
  }
  if (mode === "stepdown") {
    return "This upload is for step-down care. Return every medicine and every laboratory or radiology test written on the prescription.";
  }
  if (mode === "vaccination") {
    return "This upload is for vaccination. Return every medicine, vaccine, and test written on the prescription.";
  }
  return "";
}

function emptyWarning(mode) {
  if (mode === "medicine") {
    return "No medicines could be read from this prescription. Try a closer, well-lit photo.";
  }
  if (mode === "lab") {
    return "No laboratory tests could be read from this prescription. Try a closer, well-lit photo.";
  }
  if (mode === "radiology") {
    return "No radiology tests could be read from this prescription. Try a closer, well-lit photo.";
  }
  if (mode === "labs") {
    return "No laboratory or radiology tests could be read from this prescription. Try a closer, well-lit photo.";
  }
  return "";
}

/**
 * Keep only what the upload section asked for.
 * medicine → medicines, lab → laboratory tests, radiology → imaging, stepdown → both.
 */
export function applyRxDetect(result, detect) {
  const mode = normalizeRxDetect(detect || result?.detect);
  if (!result || typeof result !== "object") return result;
  if (!mode || mode === "stepdown" || mode === "vaccination") {
    return { ...result, detect: mode };
  }

  const medicines = mode === "medicine" ? result.medicines || [] : [];
  const tests =
    mode === "medicine"
      ? []
      : mode === "labs"
        ? result.tests || []
        : (result.tests || []).filter((test) => testServiceKind(test.name) === mode);
  const found = medicines.length > 0 || tests.length > 0;
  let warning = String(result.warning || "");
  if (!found) {
    warning = emptyWarning(mode) || warning;
  } else if (mode !== "medicine" && /medicine names were not clear/i.test(warning)) {
    warning = "";
  }

  return {
    ...result,
    detect: mode,
    medicines,
    tests,
    medicinesConfirmed: mode === "medicine" ? Boolean(result.medicinesConfirmed) : true,
    warning,
  };
}
