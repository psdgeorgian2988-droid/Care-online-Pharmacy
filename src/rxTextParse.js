import {
  canonicalizeMedicineName,
  canonicalizeTestName,
  foldRx,
} from "./rxCanonicalize.js";

const FORM_RE =
  /^(?:tab(?:let)?s?|t\.|cap(?:sule)?s?|syp|syr(?:up)?|inj(?:ection)?|oint(?:ment)?|crm|cream|gel|drops?|inh|respule|sachet|powd(?:er)?|lotion|spray|susp(?:ension)?|mouthwash|elixir|lozenges?)\b\.?/i;

const CHART_RE = /\b(\d{1,2}(?:\s*-\s*\d{1,2}){1,3})\b/;
const DURATION_RE =
  /\b(?:x\s*)?(\d{1,3})\s*(days?|d|weeks?|wks?|w|months?|mths?|m)\b|\b(\d{1,2})\s*\/\s*(7|52|30)\b/i;
const FREQ_RE = /\b(od|bd|tds|qid|hs|sos|stat|once daily|twice daily|thrice daily|once a day|twice a day|three times a day)\b/i;
const STRENGTH_RE =
  /\b(\d+(?:\.\d+)?\s*(?:mcg|μg|ug|mg|g|ml|iu|i\.?u\.?|%|μgm|ugm|mcg\/ml|mg\/ml))\b/i;
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
  ["uliue", "Urine R/M"],
  ["urine routine", "Urine routine"],
  ["urine pc ratio", "Urine Protein/Creatinine Ratio"],
  ["urine p/c", "Urine Protein/Creatinine Ratio"],
  ["urine pcr", "Urine Protein/Creatinine Ratio"],
  ["upcr", "Urine Protein/Creatinine Ratio"],
  ["ipth", "Intact PTH (iPTH)"],
  ["i-pth", "Intact PTH (iPTH)"],
  ["i pth", "Intact PTH (iPTH)"],
  ["pth", "Intact PTH (iPTH)"],
  ["pty", "Intact PTH (iPTH)"],
  ["2cct", "CBC"],
  ["bcct", "CBC"],
  ["cbcesr", "CBC"],
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

const DOSE_CODE_RE = /\b(qid|tds|bd|od|hs|sos|stat)\b/i;

export function rxDoseCode(med) {
  if (!med) return "";
  if (med.doseCode && DOSE_CODE_RE.test(String(med.doseCode))) {
    return String(med.doseCode).match(DOSE_CODE_RE)[1].toUpperCase();
  }
  const blob = [med.timing, med.frequency, med.timesPerDay, med.instructions]
    .filter(Boolean)
    .join(" ");
  const written = String(blob).match(DOSE_CODE_RE);
  if (written) return written[1].toUpperCase();
  const times = String(med.timesPerDay || med.frequency || "");
  if (/as needed/i.test(times)) return "SOS";
  if (/4 times/i.test(times)) return "QID";
  if (/3 times|thrice/i.test(times)) return "TDS";
  if (/2 times|twice/i.test(times)) return "BD";
  if (/1 time|once/i.test(times)) return "OD";
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

const HEADER_RE =
  /^(?:patient|date|dr|doctor|clinic|hospital|rx|prescription|age|sex|m\/f|opd|amount|paid|ref|bill|appointment|company|department|present|complaint|treatment|past|history|examination|diagnosis|self|hurts)\b/i;
const MED_START_RE =
  /(?:^|\s)((?:t\.|tab(?:let)?s?\.?|cap(?:sule)?s?\.?|syp\.?|syr(?:up)?\.?|inj(?:ection)?\.?)\s+.+)$/i;

function medicineSegment(line) {
  const raw = String(line || "").replace(NUMBERED_RE, "").trim();
  const fromForm = raw.match(MED_START_RE);
  if (fromForm) return fromForm[1].trim();
  return raw;
}

function cleanName(raw) {
  return String(raw || "")
    .replace(NUMBERED_RE, "")
    .replace(/^(?:t\.|tab(?:let)?s?\.?|cap(?:sule)?s?\.?|syp\.?|syr(?:up)?\.?|inj(?:ection)?\.?)\s+/i, "")
    .replace(CHART_RE, " ")
    .replace(DURATION_RE, " ")
    .replace(FREQ_RE, " ")
    .replace(STRENGTH_RE, " ")
    .replace(FOOD_RE, " ")
    .replace(/\b(?:x|for|times?|daily|day|days|week|weeks)\b/gi, " ")
    .replace(/[()]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[.,;:=]+$/g, "");
}

export function cleanOcrText(text) {
  return String(text || "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/μg[m]?/gi, "mcg")
    .replace(/\bugm\b/gi, "mcg")
    .replace(/(\d):(\d{2})\s*(mcg|mg|ug)/gi, "$1.$2 $3")
    .replace(/[@]/g, "0")
    .replace(/(\d)\s*-\s*[aAoO]\s*-/g, "$1-0-")
    .replace(/-\s*[aAoO](?=\d)/g, "-0")
    .replace(/-\s*[aAoO]\b/g, "-0")
    .replace(/[-–—]\s*o[dhn]\.?\b/gi, "-OD")
    .replace(/\b(trae|tae|ta8)\b/gi, "Tab")
    .replace(/\b(DAYE|DAVS|DAY5)\b/gi, "days")
    .replace(/\b(S00MG)\b/gi, "500mg")
    .replace(/\b(xX|xx)\b/g, "x");
}

function formFromLine(line) {
  const m = String(line || "").match(FORM_RE);
  if (!m) return "";
  const token = m[0].toLowerCase().replace(/\./g, "");
  if (token === "t" || token.startsWith("tab") || token === "trae" || token === "tae" || token === "ta8") {
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
  const raw = medicineSegment(line);
  if (!raw || raw.length < 3) return null;
  if (HEADER_RE.test(raw) && !MED_START_RE.test(raw)) return null;

  const chart = raw.match(CHART_RE)?.[1]?.replace(/\s+/g, "") || "";
  const freqCode = raw.match(FREQ_RE)?.[1] || "";
  const strength = raw.match(STRENGTH_RE)?.[1] || "";
  const duration = durationFromMatch(raw.match(DURATION_RE));
  const food = raw.match(FOOD_RE)?.[1] || "";
  const form = formFromLine(raw);
  const draftName = cleanName(raw);
  const known = draftName ? canonicalizeMedicineName(draftName, { strength, form }) : null;
  const looksMed = Boolean(form || chart || freqCode || strength || known?.verified);
  if (!looksMed) return null;

  const name = cleanName(raw);
  if (!name || name.length < 2) return null;
  if (/^(adv|advice|investigation|investigations|tests?|rx|prescription)$/i.test(name)) {
    return null;
  }
  const letterCount = name.replace(/[^a-z]/gi, "").length;
  if (!known?.verified) {
    if (letterCount < 3 || name.length > 48) return null;
    if (name.split(/\s+/).length > 6) return null;
    if (!form && !strength && !chart && !freqCode) return null;
    if (form && !strength && !chart && !freqCode && letterCount < 5) return null;
  }

  const timesPerDay = freqFromChart(chart) || freqFromCode(freqCode);
  const timing = [chart, freqCode, food].filter(Boolean).join(" ").trim();
  const doseCode = rxDoseCode({ timing, timesPerDay, frequency: timesPerDay });

  return {
    name,
    strength,
    form,
    duration,
    durationDays: duration,
    timesPerDay,
    timing,
    frequency: timesPerDay,
    doseCode,
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
  if (/cbcesr|cbc\s*esr|2cct|bcct|crcesp|crcesr|crcesr|rcce/i.test(blob)) {
    for (const label of ["CBC", "ESR"]) {
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ name: label, notes: "" });
    }
  }
  return found;
}

function isDoseOnly(line) {
  const raw = String(line || "").trim();
  if (!raw) return false;
  const withoutDose = cleanName(raw);
  return (
    withoutDose.length < 3 &&
    Boolean(raw.match(CHART_RE) || raw.match(FREQ_RE) || raw.match(DURATION_RE) || raw.match(STRENGTH_RE))
  );
}

function mergeDoseLines(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const cur = lines[i];
    const next = lines[i + 1] || "";
    if (!parseMedicineLine(cur) && next && parseMedicineLine(`${cur} ${next}`)) {
      out.push(`${cur} ${next}`);
      i += 1;
      continue;
    }
    if (parseMedicineLine(cur) && isDoseOnly(next) && parseMedicineLine(`${cur} ${next}`)) {
      out.push(`${cur} ${next}`);
      i += 1;
      continue;
    }
    out.push(cur);
  }
  return out;
}

function doseNearGram(text, gram) {
  const raw = String(text || "");
  const token = String(gram || "").split(" ")[0] || "";
  const idx = token ? raw.toLowerCase().indexOf(token.toLowerCase()) : -1;
  const window = idx >= 0 ? raw.slice(Math.max(0, idx - 12), idx + 80) : raw;
  const chart = window.match(CHART_RE)?.[1]?.replace(/\s+/g, "") || "";
  const freqCode = window.match(FREQ_RE)?.[1] || "";
  const strength = window.match(STRENGTH_RE)?.[1] || "";
  const timesPerDay = freqFromChart(chart) || freqFromCode(freqCode);
  return {
    strength,
    timesPerDay,
    timing: [chart, freqCode].filter(Boolean).join(" ").trim(),
    frequency: timesPerDay,
  };
}

function huntKnownMedicines(text) {
  const words = foldRx(text)
    .split(" ")
    .filter((part) => part.length > 1);
  const grams = [];
  for (let i = 0; i < words.length; i += 1) {
    grams.push(words[i]);
    if (words[i + 1]) grams.push(`${words[i]} ${words[i + 1]}`);
    if (words[i + 2]) grams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  const found = [];
  const seen = new Set();
  for (const gram of grams) {
    const compact = gram.replace(/\s/g, "");
    if (compact.length < 4) continue;
    if (canonicalizeTestName(gram).some((row) => row.verified)) continue;
    const hit = canonicalizeMedicineName(gram);
    if (!hit.verified) continue;
    if (compact.length < 5 && (hit.score || 0) < 100) continue;
    if ((hit.score || 0) < 86) continue;
    const key = foldRx(hit.salt || hit.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const dose = doseNearGram(text, gram);
    found.push({
      name: hit.name,
      strength: dose.strength || hit.strength || "",
      form: hit.form || "",
      duration: "",
      durationDays: "",
      timesPerDay: dose.timesPerDay || "",
      timing: dose.timing || "",
      frequency: dose.frequency || "",
      doseCode: rxDoseCode(dose),
      instructions: "",
      quantity: "",
    });
  }
  return found;
}

function explodeFormLines(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n|,(?=\s*(?:t\.|tab|cap|syp|inj)\b)/i)
    .flatMap((line) => {
      const raw = String(line || "").trim();
      if (!raw) return [];
      const parts = raw.split(/(?=(?:^|\s)(?:t\.|tab\.?|cap\.?|syp\.?|inj\.?)\s+)/i);
      return parts.map((part) => part.trim()).filter(Boolean);
    });
}

export function parseRxText(text) {
  const cleaned = cleanOcrText(text);
  const lines = mergeDoseLines(explodeFormLines(cleaned));

  const medicines = [];
  const seenMed = new Set();
  const pushMed = (med) => {
    if (!med?.name) return;
    const hit = canonicalizeMedicineName(med.name, med);
    const name = hit.name || med.name;
    const saltKey = foldRx(hit.salt || name);
    const nameKey = foldRx(name);
    if (!saltKey || seenMed.has(saltKey) || seenMed.has(nameKey)) return;
    seenMed.add(saltKey);
    seenMed.add(nameKey);
    medicines.push({
      ...med,
      name,
      strength: med.strength || hit.strength || "",
      form: med.form || hit.form || "",
      salt: hit.salt || med.salt || "",
    });
  };

  for (const line of lines) {
    pushMed(parseMedicineLine(line));
  }
  for (const extra of huntKnownMedicines(cleaned)) {
    pushMed(extra);
  }

  const kept = medicines.filter((row) => {
    if (row.salt) return true;
    const hit = canonicalizeMedicineName(row.name, row);
    if (hit.verified) return true;
    const letters = row.name.replace(/[^a-z]/gi, "").length;
    if (row.form && (row.strength || row.timesPerDay || row.timing) && letters >= 3) return true;
    return Boolean(row.strength && row.form && letters >= 4);
  });

  return {
    patientName: "",
    doctorName: "",
    date: "",
    medicines: kept,
    tests: parseTestsFromText(cleaned),
    notes: "",
  };
}
