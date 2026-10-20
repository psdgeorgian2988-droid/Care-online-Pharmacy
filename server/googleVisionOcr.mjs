const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

export function googleVisionConfigured() {
  return Boolean(String(process.env.GOOGLE_CLOUD_VISION_API_KEY || "").trim());
}

function imageBase64(dataUrl = "") {
  const raw = String(dataUrl || "").trim();
  const match = raw.match(/^data:image\/[a-z0-9.+-]+;base64,([\s\S]+)$/i);
  if (match) return match[1].replace(/\s/g, "");
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw.slice(0, 80)) && raw.length > 80) {
    return raw.replace(/\s/g, "");
  }
  throw new Error("Google Cloud Vision OCR needs a JPG, PNG, or WebP image.");
}

export async function googleVisionOcr(dataUrl = "") {
  const apiKey = String(process.env.GOOGLE_CLOUD_VISION_API_KEY || "").trim();
  if (!apiKey) throw new Error("GOOGLE_CLOUD_VISION_API_KEY is not configured.");

  const url = new URL(VISION_ENDPOINT);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64(dataUrl) },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["en-t-i0-handwrit", "en"] },
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.error?.message || "Google Cloud Vision OCR failed.");
    throw new Error(message.slice(0, 400));
  }

  const result = payload?.responses?.[0];
  if (result?.error?.message) {
    throw new Error(String(result.error.message).slice(0, 400));
  }
  const text = String(
    result?.fullTextAnnotation?.text || result?.textAnnotations?.[0]?.description || ""
  ).trim();
  if (!text) throw new Error("Google Cloud Vision did not find readable text in this image.");
  return text;
}
