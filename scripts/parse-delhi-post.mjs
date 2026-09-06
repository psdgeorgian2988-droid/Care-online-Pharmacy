import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RAW_DELHI_POST } from "./delhi-india-post.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "server/delhiPostOffices.mjs");

const DISTRICT =
  /(?:East|West|North|South|Central|North East|North West|South West|South East)\s+Delhi/i;

const OFFICE_TYPE =
  /(?:G\.?\s*P\.?\s*O\.?|H\.?\s*O\.?|S\.?\s*O\.?|B\.?\s*O\.?|P\.?\s*O\.?|EXTENSION COUNTER|EXTN COUNTER|NODAL DELIVERY CENTRE)(?![A-Za-z])/i;

const JUNK_NAME =
  /^(?:pincode|delivery|non|office|type|region|division|delhi|circle|pinblock|use|cat|ngt|po|ho|so|bo|new delhi|delhi gpo)$/i;

function titleCase(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text !== text.toUpperCase() && /[a-z]/.test(text)) return text;
  return text
    .toLowerCase()
    .replace(/(^|[\s/&().-])([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

function cleanOfficeName(raw) {
  let name = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  name = name.replace(/^Office Name\s+/i, "");
  name = name.replace(/^Pincode Delivery\/?\s*Non Delivery Office Type Circle\s+/i, "");
  name = name.replace(new RegExp(`^${DISTRICT.source}\\s+`, "i"), "");
  name = name.replace(new RegExp(`\\s+${DISTRICT.source}$`, "i"), "");
  name = name.replace(/\s*\(([^)]*)\)/g, " $1 ");
  name = name.replace(
    /\s+(?:G\.?\s*P\.?\s*O\.?|H\.?\s*O\.?|S\.?\s*O\.?|B\.?\s*O\.?|P\.?\s*O\.?)\.?$/i,
    ""
  );
  name = name.replace(/\s+(?:EXTENSION COUNTER|EXTN COUNTER|NODAL DELIVERY CENTRE)$/i, "");
  name = name.replace(/^(?:PO|HO|SO|BO)\s+Delhi\s+Circle\s+/i, "");
  name = name.replace(/^PINBLOCK\s+Circle\s+/i, "");
  name = name.replace(/\bsec(?:t(?:or)?)?[-\s.]*([0-9]+|[ivxlcdm]+)\b/gi, "Sector $1");
  name = name.replace(/\bph(?:ase)?\s*(i{1,3}|\d+)\b/gi, "Phase $1");
  name = name.replace(/\s+/g, " ").trim();
  name = titleCase(name);
  name = name
    .replace(/\bGtb\b/g, "GTB")
    .replace(/\bHs\b/g, "HS")
    .replace(/\bNs\b/g, "NS")
    .replace(/\bIp\b/g, "IP")
    .replace(/\bRcao\b/g, "RCAO")
    .replace(/\bNsit\b/g, "NSIT")
    .replace(/\bGgsip\b/g, "GGSIP")
    .replace(/\bIgi\b/g, "IGI")
    .replace(/\bJnu\b/g, "JNU")
    .replace(/\bIgnou\b/g, "IGNOU")
    .replace(/\bRml\b/g, "RML")
    .replace(/\bNdho\b/g, "NDHO")
    .replace(/\bAgcr\b/g, "AGCR")
    .replace(/\bKkd\b/g, "KKD")
    .replace(/\bBtps\b/g, "BTPS")
    .replace(/\bCrpf\b/g, "CRPF")
    .replace(/\bEsi\b/g, "ESI")
    .replace(/\bD\.?\s*E\.?\s*S\.?\s*U\.?\b\.?/gi, "DESU")
    .replace(/\bD\.?\s*K\.?\b/gi, "DK")
    .replace(/\bM\.?\s*B\.?\s*S\.?\b/gi, "MBS")
    .replace(/\bL\.?\s*M\.?\b/gi, "LM")
    .replace(/\bF\.?\s*F\.?\s*C\.?\b/gi, "FFC")
    .replace(/\bC\.?\s*R\.?\s*R\.?\s*I\.?\b/gi, "CRRI")
    .replace(/\bM\.?\s*M\.?\s*T\.?\s*C\.?\b/gi, "MMTC")
    .replace(/\bS\.?\s*T\.?\s*C\.?\b/gi, "STC")
    .replace(/\bN\.?\s*S\.?\s*I\.?\s*T\.?\b\.?/gi, "NSIT");
  return name.replace(/\s+/g, " ").replace(/\.\s*\./g, ".").trim();
}

function isUsefulName(name) {
  if (!name || name.length < 3) return false;
  if (JUNK_NAME.test(name)) return false;
  if (/delhi\s+circle/i.test(name)) return false;
  if (/^pinblock/i.test(name)) return false;
  if (/^(?:po|ho|so|bo)\b/i.test(name)) return false;
  if (!/[a-z]/i.test(name)) return false;
  return true;
}

function extractInlinePairs(text) {
  const pairs = [];
  const re = new RegExp(
    `([A-Za-z0-9][A-Za-z0-9 .,&'/()-]{1,80}?)\\s+(${OFFICE_TYPE.source})(?:\\s*\\([^)]*\\))?(?:\\s+${DISTRICT.source})?\\s+(110\\d{3})\\s+(?:Delivery|Non-Delivery|Non Delivery)`,
    "gi"
  );
  let match;
  while ((match = re.exec(text))) {
    const name = cleanOfficeName(`${match[1]} ${match[2]}`);
    if (isUsefulName(name)) pairs.push([match[3], name]);
  }
  return pairs;
}

function extractPins(text) {
  const pins = [];
  const re = /\b(110\d{3})\s+(?:Delivery|Non-Delivery|Non Delivery)\b/gi;
  let match;
  while ((match = re.exec(text))) pins.push(match[1]);
  return pins;
}

function extractOffices(text) {
  const offices = [];
  const cleaned = String(text || "")
    .replace(/Pincode Delivery\/\s*Non Delivery/gi, " ")
    .replace(/Office\s*Type/gi, " ")
    .replace(/Region Delhi/gi, " ")
    .replace(/Delhi (?:East|North|West|GPO|South West|South|Central) Division/gi, " ")
    .replace(/New Delhi (?:West|South West|South|Central|GPO) Division/gi, " ")
    .replace(/Circle \d{1,2}\b/gi, " ")
    .replace(/\b110\d{3}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const re = new RegExp(
    `([A-Za-z0-9][A-Za-z0-9 .,&'/()-]{1,80}?)\\s+(${OFFICE_TYPE.source})(?:\\s*\\([^)]*\\))?(?:\\s+${DISTRICT.source})?`,
    "gi"
  );
  let match;
  while ((match = re.exec(cleaned))) {
    const name = cleanOfficeName(`${match[1]} ${match[2]}`);
    if (isUsefulName(name)) offices.push(name);
  }
  return offices;
}

const byPin = new Map();

function add(pin, name) {
  if (!/^\d{6}$/.test(pin) || !isUsefulName(name)) return;
  const list = byPin.get(pin) || [];
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!key || list.some((row) => row.key === key)) return;
  list.push({ name, key });
  byPin.set(pin, list);
}

// 1) Prefer explicit office+PIN pairs across the whole dump.
for (const [pin, name] of extractInlinePairs(RAW_DELHI_POST)) {
  add(pin, name);
}

// 2) For remaining block pages, zip office names with the PIN list.
const pages = String(RAW_DELHI_POST)
  .split(/(?=Office Name\b)/i)
  .map((page) => page.trim())
  .filter(Boolean);

const report = [];
for (const [index, page] of pages.entries()) {
  const inline = extractInlinePairs(page);
  if (inline.length) {
    report.push({ page: index + 1, used: "inline", count: inline.length });
    continue;
  }

  const pins = extractPins(page);
  const namePart = /Pincode Delivery/i.test(page)
    ? page.split(/Pincode Delivery/i)[0]
    : page;
  const offices = extractOffices(namePart);
  const count = Math.min(pins.length, offices.length);
  for (let i = 0; i < count; i += 1) add(pins[i], offices[i]);
  report.push({
    page: index + 1,
    used: "zip",
    pins: pins.length,
    offices: offices.length,
    paired: count,
  });
}

const data = Object.fromEntries(
  [...byPin.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pin, rows]) => [
      pin,
      rows.map((row) => row.name).sort((a, b) => a.localeCompare(b)),
    ])
);

await writeFile(
  OUT,
  `/** India Post office names for Delhi PINs (Village / Sector / Mohalla dropdown). */\nexport const DELHI_POST_OFFICES = ${JSON.stringify(data, null, 2)};\n`
);

const officeCount = Object.values(data).reduce((n, list) => n + list.length, 0);
console.log(
  JSON.stringify(
    {
      pages: report,
      pinCount: Object.keys(data).length,
      officeCount,
      sample: {
        110031: data["110031"],
        110075: data["110075"],
        110085: data["110085"],
        110001: data["110001"]?.slice(0, 12),
      },
    },
    null,
    2
  )
);
console.log(`Wrote ${OUT}`);
