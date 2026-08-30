import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "uploads");

function uploadsRoot() {
  return process.env.MEDIHOME_UPLOADS_DIR || root;
}
const MAX_BYTES = 1_500_000;
const KINDS = new Set(["aadhaar", "police"]);

function extFor(mime, fileName) {
  const name = String(fileName || "").toLowerCase();
  if (String(mime).includes("pdf") || name.endsWith(".pdf")) return ".pdf";
  if (String(mime).includes("png") || name.endsWith(".png")) return ".png";
  if (String(mime).includes("webp") || name.endsWith(".webp")) return ".webp";
  return ".jpg";
}

export function parseUploadPayload(payload = {}) {
  const dataUrl = String(payload.dataUrl || payload.data || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    return {
      mime: match[1].trim().toLowerCase(),
      buffer: Buffer.from(match[2], "base64"),
      fileName: String(payload.fileName || payload.name || ""),
    };
  }
  if (payload.buffer) {
    return {
      mime: String(payload.mime || "application/octet-stream"),
      buffer: Buffer.isBuffer(payload.buffer) ? payload.buffer : Buffer.from(payload.buffer),
      fileName: String(payload.fileName || payload.name || ""),
    };
  }
  return null;
}

export function mimeAllowed(mime) {
  return (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    mime === "application/pdf"
  );
}

export async function savePartnerUpload(partnerId, kind, payload) {
  const key = String(kind || "").toLowerCase();
  if (!KINDS.has(key)) return { ok: false, error: "Unknown document type." };
  const parsed = parseUploadPayload(payload);
  if (!parsed?.buffer?.length) return { ok: false, error: "Upload a document file." };
  if (!mimeAllowed(parsed.mime)) {
    return { ok: false, error: "Upload a JPG, PNG, WEBP, or PDF file." };
  }
  if (parsed.buffer.length > MAX_BYTES) {
    return { ok: false, error: "Each document must be under 1.5 MB." };
  }
  const fileName = `${key}${extFor(parsed.mime, parsed.fileName)}`;
  const dir = path.join(uploadsRoot(), String(partnerId));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), parsed.buffer);
  return { ok: true, file: fileName, mime: parsed.mime };
}

export async function readPartnerUpload(partnerId, kind) {
  const key = String(kind || "").toLowerCase();
  if (!KINDS.has(key)) return null;
  const dir = path.join(uploadsRoot(), String(partnerId));
  const candidates = [`${key}.jpg`, `${key}.jpeg`, `${key}.png`, `${key}.webp`, `${key}.pdf`];
  for (const file of candidates) {
    try {
      const buf = await readFile(path.join(dir, file));
      const ext = path.extname(file).toLowerCase();
      const mime =
        ext === ".pdf"
          ? "application/pdf"
          : ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : "image/jpeg";
      return { buffer: buf, mime, file };
    } catch {
      /* try next */
    }
  }
  return null;
}
