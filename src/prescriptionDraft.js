export const PRESCRIPTION_DRAFT_KEY = "mediHomePrescriptionDraft";
export const PRESCRIPTION_EVENT = "mediHomePrescription";
export const MAX_PRESCRIPTION_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;

const ALLOWED_EXT = /\.(pdf|png|jpe?g|webp)$/i;

export function isAllowedPrescriptionFile(file) {
  if (!file) return false;
  const type = String(file.type || "");
  if (type === "application/pdf" || type.startsWith("image/")) return true;
  return ALLOWED_EXT.test(file.name || "");
}

export function readPrescriptionDraft(store) {
  try {
    const storage = store || globalThis.localStorage;
    const raw = storage?.getItem?.(PRESCRIPTION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const fileName = String(parsed.fileName || "").trim();
    if (!fileName) return null;
    return {
      fileName,
      fileType: String(parsed.fileType || ""),
      fileData: String(parsed.fileData || ""),
      savedAt: String(parsed.savedAt || ""),
    };
  } catch {
    return null;
  }
}

export function writePrescriptionDraft(draft, store) {
  const storage = store || globalThis.localStorage;
  const next = {
    fileName: String(draft?.fileName || "").trim(),
    fileType: String(draft?.fileType || ""),
    fileData: String(draft?.fileData || ""),
    savedAt: new Date().toISOString(),
  };
  if (!next.fileName) {
    clearPrescriptionDraft(store);
    return null;
  }
  storage?.setItem?.(PRESCRIPTION_DRAFT_KEY, JSON.stringify(next));
  notifyPrescriptionChanged();
  return next;
}

export function clearPrescriptionDraft(store) {
  try {
    (store || globalThis.localStorage)?.removeItem?.(PRESCRIPTION_DRAFT_KEY);
  } catch {
    /* ignore */
  }
  notifyPrescriptionChanged();
}

function notifyPrescriptionChanged() {
  try {
    globalThis.dispatchEvent?.(new Event(PRESCRIPTION_EVENT));
  } catch {
    /* ignore */
  }
}

function dataUrlBytes(dataUrl) {
  const comma = String(dataUrl || "").indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.ceil((b64.length * 3) / 4);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

async function compressImageToDraft(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width || 1, img.height || 1));
    const width = Math.max(1, Math.round((img.width || 1) * scale));
    const height = Math.max(1, Math.round((img.height || 1) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare that image.");
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrlBytes(dataUrl) > MAX_PRESCRIPTION_BYTES && quality > 0.45) {
      quality -= 0.12;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    if (dataUrlBytes(dataUrl) > MAX_PRESCRIPTION_BYTES) {
      throw new Error("Image is still too large after shrinking. Try a clearer close-up photo.");
    }
    return {
      fileName: String(file.name || "prescription").replace(/\.\w+$/, "") + ".jpg",
      fileType: "image/jpeg",
      fileData: dataUrl,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Read a File into a draft payload (compressed image or PDF data URL). */
export async function fileToPrescriptionDraft(file) {
  if (!isAllowedPrescriptionFile(file)) {
    throw new Error("Upload a JPG, PNG, WEBP, or PDF file.");
  }

  const type = String(file.type || "");
  const isImage = type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name || "");
  const isPdf = type === "application/pdf" || /\.pdf$/i.test(file.name || "");

  if (isImage) {
    try {
      return await compressImageToDraft(file);
    } catch (error) {
      if (file.size > MAX_PRESCRIPTION_BYTES) throw error;
    }
  }

  if (isPdf && file.size > MAX_PRESCRIPTION_BYTES) {
    throw new Error("PDF is too large. Photograph the prescription page as an image instead.");
  }

  const fileData = await readFileAsDataUrl(file);
  if (!fileData) {
    throw new Error("Could not read that file. Try another image or PDF.");
  }
  return {
    fileName: file.name,
    fileType: type || "application/octet-stream",
    fileData,
  };
}

export function prescriptionDraftIsImage(draft) {
  if (!draft) return false;
  const type = String(draft.fileType || "");
  if (type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp)$/i.test(draft.fileName || "");
}

export function prescriptionDraftIsPdf(draft) {
  if (!draft) return false;
  const type = String(draft.fileType || "");
  if (type === "application/pdf") return true;
  return /\.pdf$/i.test(draft.fileName || "");
}

export function fileFromPrescriptionDraft(draft) {
  if (!draft?.fileData) return null;
  try {
    const raw = String(draft.fileData);
    const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) return null;
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], draft.fileName || "prescription", {
      type: match[1] || draft.fileType || "application/octet-stream",
    });
  } catch {
    return null;
  }
}
