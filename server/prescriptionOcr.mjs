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

export async function ocrPrescriptionImage(fileData = "") {
  const raw = String(fileData || "");
  if (!raw) {
    throw new Error("No prescription image data to read.");
  }
  const worker = await getWorker();
  try {
    const first = await worker.recognize(raw, { rotateAuto: true });
    const text = String(first?.data?.text || "").trim();
    if (text.length >= 12) return text;
  } catch {
    /* fall through to a plain pass */
  }
  const second = await worker.recognize(raw);
  return String(second?.data?.text || "").trim();
}
