const STRIP_NOISE = new Set(
  [
    "tablet",
    "tablets",
    "capsule",
    "capsules",
    "syrup",
    "strip",
    "strips",
    "mfg",
    "exp",
    "expiry",
    "batch",
    "mrp",
    "incl",
    "gst",
    "licensed",
    "manufactured",
    "manufacturer",
    "marketed",
    "by",
    "ltd",
    "limited",
    "pvt",
    "private",
    "each",
    "contains",
    "uncoated",
    "film",
    "coated",
    "ip",
    "bp",
    "usp",
    "rx",
    "schedule",
    "h",
    "warning",
    "keep",
    "out",
    "reach",
    "children",
    "store",
    "below",
    "protect",
    "light",
    "moisture",
  ].map((word) => word.toLowerCase())
);

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the photo reader."));
    document.head.appendChild(script);
  });
}

export function cleanOcrQuery(raw) {
  const lines = String(raw || "")
    .split(/\n+/)
    .map((line) => line.replace(/[^a-zA-Z0-9.+%\-\s]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3);

  const scored = lines.map((line) => {
    const hasStrength = /\d+(\.\d+)?\s*(mg|mcg|iu|ml|%)/i.test(line);
    const letters = (line.match(/[a-zA-Z]/g) || []).length;
    return { line, score: (hasStrength ? 8 : 0) + Math.min(letters, 24) };
  });
  scored.sort((a, b) => b.score - a.score);

  const preferred = scored
    .slice(0, 4)
    .map((row) => row.line)
    .join(" ");

  const tokens = preferred
    .split(/[\s,/]+/)
    .map((token) => token.trim())
    .filter((token) => {
      if (!token) return false;
      if (/^\d{6,}$/.test(token)) return false;
      if (STRIP_NOISE.has(token.toLowerCase())) return false;
      if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{0,2}$/i.test(token)) {
        return false;
      }
      return /[a-zA-Z]/.test(token) || /^\d+(\.\d+)?(mg|mcg|iu|ml|%)?$/i.test(token);
    });

  const unique = [];
  tokens.forEach((token) => {
    const key = token.toLowerCase();
    if (!unique.some((item) => item.toLowerCase() === key)) unique.push(token);
  });

  return unique.slice(0, 10).join(" ").trim();
}

export async function textFromStripPhoto(file) {
  if (!file) throw new Error("Please choose a photo of the strip.");
  await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
  const Tesseract = window.Tesseract;
  if (!Tesseract?.recognize) {
    throw new Error("Photo reader did not start. Check your internet and try again.");
  }
  const result = await Tesseract.recognize(file, "eng", {
    tessedit_pageseg_mode: 6,
  });
  return String(result?.data?.text || "");
}

export function voiceSearchSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startVoiceSearch({ onResult, onError, onEnd }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError?.(
      "Voice search needs Chrome, Edge, or Safari. You can still type or use a photo."
    );
    onEnd?.();
    return null;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const spoken = event.results?.[0]?.[0]?.transcript || "";
    if (spoken.trim()) onResult?.(spoken.trim());
    else onError?.("Did not catch that. Please try again.");
  };
  recognition.onerror = (event) => {
    if (event.error === "not-allowed") {
      onError?.("Microphone permission is required for voice search.");
    } else if (event.error !== "aborted") {
      onError?.("Voice search stopped. Please try again.");
    }
  };
  recognition.onend = () => onEnd?.();
  recognition.start();
  return recognition;
}
