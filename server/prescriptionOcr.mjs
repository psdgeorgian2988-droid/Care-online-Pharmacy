const OCR_PSM = ["6", "4", "11"];

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js")
      .then(({ createWorker }) => createWorker("eng", 1, { logger: () => {} }))
      .catch((error) => {
        workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

function scoreOcrText(text) {
  const raw = String(text || "").trim();
  if (!raw) return 0;
  const lines = raw.split(/\r?\n/).filter((line) => line.trim()).length;
  return raw.length + lines * 8;
}

export async function ocrPrescriptionImage(fileData = "") {
  const raw = String(fileData || "");
  if (!raw) {
    throw new Error("No prescription image data to read.");
  }
  const worker = await getWorker();
  let best = "";
  let bestScore = -1;

  for (const psm of OCR_PSM) {
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        preserve_interword_spaces: "1",
      });
      const result = await worker.recognize(raw, { rotateAuto: true });
      const text = String(result?.data?.text || "").trim();
      const score = scoreOcrText(text);
      if (score > bestScore) {
        best = text;
        bestScore = score;
      }
    } catch {
      /* try the next page-seg mode */
    }
  }

  if (bestScore >= 0) return best;

  const fallback = await worker.recognize(raw);
  return String(fallback?.data?.text || "").trim();
}
