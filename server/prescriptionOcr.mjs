const OCR_PSM = ["6", "4", "11", "3"];

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
  const medHints = (raw.match(/\b(?:t\.|tab|cap|syp|inj|od|bd|tds|mg|mcg)\b/gi) || []).length;
  return raw.length + lines * 8 + medHints * 20;
}

function dataUrlToBuffer(fileData = "") {
  const raw = String(fileData || "");
  const m = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (m) return Buffer.from(m[2], "base64");
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw.slice(0, 80)) && raw.length > 80) {
    return Buffer.from(raw.replace(/\s/g, ""), "base64");
  }
  return null;
}

async function ffmpegAvailable() {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    await run("ffmpeg", ["-version"], { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

async function runFfmpeg(inputPath, vf, outputPath) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", inputPath, "-vf", vf, outputPath], {
    timeout: 20000,
  });
}

async function imageVariants(fileData = "") {
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const variants = [fileData];
  const buf = dataUrlToBuffer(fileData);
  if (!buf || !(await ffmpegAvailable())) return variants;

  const dir = await mkdtemp(path.join(tmpdir(), "rx-ocr-"));
  try {
    const src = path.join(dir, "src.jpg");
    await writeFile(src, buf);
    const jobs = [
      ["up.png", "scale=iw*2.4:ih*2.4,eq=contrast=1.55:brightness=0.05,format=gray,unsharp=5:5:0.8:5:5:0.0"],
      [
        "treat.png",
        "crop=iw*0.70:ih*0.58:iw*0.28:ih*0.34,scale=iw*2.8:ih*2.8,eq=contrast=1.65:brightness=0.06,format=gray,unsharp=5:5:1",
      ],
      [
        "adv.png",
        "crop=iw*0.18:ih*0.32:iw*0.18:ih*0.40,scale=iw*4:ih*4,eq=contrast=1.85:brightness=0.1,format=gray,unsharp=5:5:1.2",
      ],
      [
        "bottom.png",
        "crop=iw*0.62:ih*0.16:iw*0.30:ih*0.72,scale=iw*3:ih*3,eq=contrast=1.6:brightness=0.06,format=gray",
      ],
    ];
    for (const [name, vf] of jobs) {
      const out = path.join(dir, name);
      try {
        await runFfmpeg(src, vf, out);
        const png = await readFile(out);
        variants.push(`data:image/png;base64,${png.toString("base64")}`);
      } catch {
        /* skip a failed crop */
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  return variants;
}

async function recognizeAll(worker, image, psms = OCR_PSM) {
  let best = "";
  let bestScore = -1;
  const blobs = [];
  for (const psm of psms) {
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        preserve_interword_spaces: "1",
      });
      const result = await worker.recognize(image, { rotateAuto: true });
      const text = String(result?.data?.text || "").trim();
      if (text) blobs.push(text);
      const score = scoreOcrText(text);
      if (score > bestScore) {
        best = text;
        bestScore = score;
      }
    } catch {
      /* try the next page-seg mode */
    }
  }
  return { best, blobs };
}

export async function ocrPrescriptionImage(fileData = "") {
  const raw = String(fileData || "");
  if (!raw) {
    throw new Error("No prescription image data to read.");
  }
  const worker = await getWorker();
  const variants = await imageVariants(raw);
  const parts = [];
  let best = "";
  let bestScore = -1;
  let fullPage = "";
  let fullScore = -1;

  for (let i = 0; i < variants.length; i += 1) {
    const psms = i === 0 ? OCR_PSM : ["6"];
    const recognized = await recognizeAll(worker, variants[i], psms);
    parts.push(...recognized.blobs);
    const score = scoreOcrText(recognized.best);
    if (score > bestScore) {
      best = recognized.best;
      bestScore = score;
    }
    if (i === 0 && score >= fullScore) {
      fullPage = recognized.best;
      fullScore = score;
    }
  }

  fullPage = fullPage || best;
  const extra = [];
  const seen = new Set(
    String(fullPage || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
  for (const blob of parts.slice(1)) {
    const novel = String(blob || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => {
        if (line.length < 4) return false;
        const tokens = line.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
        return tokens.some((word) => !seen.has(word));
      });
    extra.push(...novel);
    for (const line of novel) {
      for (const word of line.toLowerCase().split(/\s+/)) {
        if (word.length > 3) seen.add(word);
      }
    }
  }
  const combined = [fullPage, ...extra, best].filter(Boolean).join("\n");
  if (combined.trim()) return combined;

  const fallback = await worker.recognize(raw);
  return String(fallback?.data?.text || "").trim();
}
