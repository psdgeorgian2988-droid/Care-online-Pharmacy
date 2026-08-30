import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "settings.json");

export const DEFAULT_FEATURES = {
  medicine: true,
  lab: true,
  radiology: true,
  homecare: true,
  vaccination: true,
  psychologist: true,
  stepdown: true,
  ambulance: true,
  reports: true,
  education: true,
  scanDelivery: true,
};

function normalizeFeatures(raw) {
  const next = { ...DEFAULT_FEATURES };
  if (!raw || typeof raw !== "object") return next;
  for (const key of Object.keys(DEFAULT_FEATURES)) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      next[key] = Boolean(raw[key]);
    }
  }
  return next;
}

async function ensureFile() {
  await mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(
      dataFile,
      `${JSON.stringify({ features: DEFAULT_FEATURES }, null, 2)}\n`
    );
  }
}

export async function readSettings() {
  await ensureFile();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return { features: normalizeFeatures(parsed?.features) };
  } catch {
    return { features: { ...DEFAULT_FEATURES } };
  }
}

export async function writeSettings(patch) {
  const current = await readSettings();
  const next = {
    features: normalizeFeatures({
      ...current.features,
      ...(patch?.features || {}),
    }),
  };
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
