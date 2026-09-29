const FORM_RE =
  /^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syr(?:up)?|inj(?:ection)?|oint(?:ment)?|crm|cream|gel|drops?|inh|respule|sachet|powd(?:er)?|lotion|spray|susp(?:ension)?|mouthwash|elixir|lozenges?)\b\.?/i;

const CHART_RE = /\b(\d{1,2}(?:\s*-\s*\d{1,2}){1,3})\b/;
const DURATION_RE =
  /\b(?:x\s*)?(\d{1,3})\s*(days?|d|weeks?|wks?|w|months?|mths?|m)\b|\b(\d{1,2})\s*\/\s*(7|52|30)\b/i;
const FREQ_RE = /\b(od|bd|tds|qid|hs|sos|stat|once daily|twice daily|thrice daily|once a day|twice a day|three times a day)\b/i;
const STRENGTH_RE = /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%|mcg\/ml|mg\/ml))\b/i;
const FOOD_RE = /\b((?:before|after)\s+(?:food|meals?)|empty stomach|with milk|with water)\b/i;
const NUMBERED_RE = /^\d{1,2}[.)]\s+/;

const TEST_NAMES = [
  ["complete blood count", "Complete Blood Count (CBC)"],
  ["cbc", "CBC"],
  ["crp", "CRP"],
  ["typhidot", "Typhidot IgM"],
  ["typhi dot", "Typhidot IgM"],
  ["dengue igm", "Dengue IgM"],
  ["dengue serology", "Dengue Serology IgM"],
  ["dengue ns1", "Dengue NS1"],
  ["dengue", "Dengue"],
  ["kft", "KFT"],
  ["lft", "LFT"],
  ["rft", "RFT"],
  ["tsh", "TSH"],
  ["hba1c", "HbA1c"],
  ["lipid profile", "Lipid profile"],
  ["lipid", "Lipid profile"],
  ["urine r/m", "Urine R/M"],
  ["urine rm", "Urine R/M"],
  ["urine routine", "Urine routine"],
  ["vitamin d", "Vitamin D"],
  ["vit d", "Vitamin D"],
  ["vitamin b12", "Vitamin B12"],
  ["b12", "Vitamin B12"],
  ["blood sugar", "Blood sugar"],
  ["fbs", "FBS"],
  ["ppbs", "PPBS"],
  ["rbs", "RBS"],
  ["esr", "ESR"],
  ["crp", "CRP"],
  ["dengue", "Dengue"],
  ["widal", "Widal"],
  ["x-ray chest", "X-Ray Chest"],
  ["x ray chest", "X-Ray Chest"],
  ["chest x-ray", "X-Ray Chest"],
  ["usg abdomen", "USG Abdomen"],
  ["ultrasound", "Ultrasound"],
  ["mri", "MRI"],
  ["ct scan", "CT scan"],
  ["ct brain", "CT Brain"],
  ["ecg", "ECG"],
  ["echo", "Echo"],
  ["thyroid", "Thyroid profile"],
];

function freqFromChart(chart) {
  const parts = String(chart || "")
    .replace(/\s+/g, "")
    .split("-")
    .map((n) => Number(n) || 0);
  const doses = parts.filter((n) => n > 0).length;
  if (doses >= 4) return "4 times a day";
  if (doses === 3) return "3 times a day";
  if (doses === 2) return "2 times a day";
  if (doses === 1) return "1 time a day";
  return "";
}

function freqFromCode(code) {
  const v = String(code || "").toLowerCase();
  if (v === "qid") return "4 times a day";
  if (v === "tds" || v.includes("thrice") || v.includes("three times")) return "3 times a day";
  if (v === "bd" || v.includes("twice")) return "2 times a day";
  if (v === "od" || v === "hs" || v === "stat" || v.includes("once")) return "1 time a day";
  if (v === "sos") return "As needed";
  return "";
}

function durationFromMatch(match) {
  if (!match) return "";
  if (match[1] && match[2]) {
    const n = match[1];
    const unit = String(match[2]).toLowerCase();
    if (unit.startsWith("d")) return `${n} days`;
    if (unit.startsWith("w")) return `${n} weeks`;
    return `${n} months`;
  }
  if (match[3] && match[4]) {
    const n = match[3];
    if (match[4] === "7") return `${n} days`;
    if (match[4] === "52") return `${n} weeks`;
    return `${n} months`;
  }
  return "";
}

function cleanName(raw) {
  return String(raw || "")
    .replace(NUMBERED_RE, "")
    .replace(CHART_RE, " ")
    .replace(DURATION_RE, " ")
    .replace(FREQ_RE, " ")
    .replace(STRENGTH_RE, " ")
    .replace(FOOD_RE, " ")
    .replace(/\b(?:x|for|times?|daily|day|days|week|weeks)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[.,;:=]+$/g, "");
}

export function cleanOcrText(text) {
  return String(text || "")
    .replace(/[@]/g, "0")
    .replace(/(\d)\s*-\s*[aAoO]\s*-/g, "$1-0-")
    .replace(/-\s*[aAoO](?=\d)/g, "-0")
    .replace(/-\s*[aAoO]\b/g, "-0")
    .replace(/\b(trae|tae|ta8)\b/gi, "Tab")
    .replace(/\b(DAYE|DAVS|DAY5)\b/gi, "days")
    .replace(/\b(S00MG)\b/gi, "500mg")
    .replace(/\b(xX|xx)\b/g, "x");
}

function formFromLine(line) {
  const m = String(line || "").match(FORM_RE);
  if (!m) return "";
  const token = m[0].toLowerCase().replace(/\./g, "");
  if (token.startsWith("tab") || token === "trae" || token === "tae" || token === "ta8") {
    return "tablet";
  }
  if (token.startsWith("cap")) return "capsule";
  if (token.startsWith("syp") || token.startsWith("syr")) return "syrup";
  if (token.startsWith("inj")) return "injection";
  if (token.startsWith("oint")) return "ointment";
  if (token.startsWith("susp")) return "suspension";
  return token;
}

export function parseMedicineLine(line) {
  const raw = String(line || "").replace(NUMBERED_RE, "").trim();
  if (!raw || raw.length < 3) return null;

  const chart = raw.match(CHART_RE)?.[1]?.replace(/\s+/g, "") || "";
  const freqCode = raw.match(FREQ_RE)?.[1] || "";
  const strength = raw.match(STRENGTH_RE)?.[1] || "";
  const duration = durationFromMatch(raw.match(DURATION_RE));
  const food = raw.match(FOOD_RE)?.[1] || "";
  const form = formFromLine(raw);
  const looksMed = Boolean(form || chart || freqCode);
  if (!looksMed) return null;

  const name = cleanName(raw);
  if (!name || name.length < 2) return null;
  if (/^(adv|advice|investigation|investigations|tests?|rx|prescription)$/i.test(name)) {
    return null;
  }

  const timesPerDay = freqFromChart(chart) || freqFromCode(freqCode);
  const timing = [chart, freqCode, food].filter(Boolean).join(" ").trim();

  return {
    name,
    strength,
    form,
    duration,
    durationDays: duration,
    timesPerDay,
    timing,
    frequency: timesPerDay,
    instructions: food,
    quantity: "",
  };
}

export function parseTestsFromText(text) {
  const blob = String(text || "").toLowerCase();
  const found = [];
  const seen = new Set();
  for (const [needle, label] of TEST_NAMES) {
    if (!blob.includes(needle)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ name: label, notes: "" });
  }
  return found;
}

export function parseRxText(text) {
  const lines = cleanOcrText(text)
    .replace(/\u00a0/g, " ")
    .split(/\r?\n|,(?=\s*(?:tab|cap|syp|inj)\b)/i)
    .map((line) => line.trim())
    .filter(Boolean);

  const medicines = [];
  const seenMed = new Set();
  for (const line of lines) {
    const med = parseMedicineLine(line);
    if (!med) continue;
    const key = `${med.name}|${med.strength}|${med.timing}`.toLowerCase();
    if (seenMed.has(key)) continue;
    seenMed.add(key);
    medicines.push(med);
  }

  return {
    patientName: "",
    doctorName: "",
    date: "",
    medicines,
    tests: parseTestsFromText(cleanOcrText(text)),
    notes: "",
  };
}
