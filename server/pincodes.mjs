import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data/pincodes.json"
);

const DISTRICT_CITY = {
  delhi: "New Delhi",
  newdelhi: "New Delhi",
  centraldelhi: "New Delhi",
  eastdelhi: "New Delhi",
  northeastdelhi: "New Delhi",
  northdelhi: "New Delhi",
  northwestdelhi: "New Delhi",
  southdelhi: "New Delhi",
  southeastdelhi: "New Delhi",
  southwestdelhi: "New Delhi",
  westdelhi: "New Delhi",
  shahdara: "New Delhi",
  mumbai: "Mumbai",
  mumbaicity: "Mumbai",
  mumbaisuburban: "Mumbai",
  gurgaon: "Gurugram",
  gurugram: "Gurugram",
  bangalore: "Bengaluru",
  bengaluru: "Bengaluru",
  bangaloreurban: "Bengaluru",
};

let directory = null;

function loadDirectory() {
  if (!directory) {
    directory = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  }
  return directory;
}

export function normalizePin(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

function normName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function alignedDistrict(district) {
  const key = normName(district);
  if (key === "gurgaon") return "Gurugram";
  return district || "";
}

export function alignedCity(city, district) {
  const resolvedDistrict = alignedDistrict(district);
  const districtKey = normName(resolvedDistrict);
  if (DISTRICT_CITY[districtKey]) return DISTRICT_CITY[districtKey];
  if (city && resolvedDistrict && normName(city) === districtKey) return city;
  return resolvedDistrict || city || "";
}

function unpack(pin, row, extra = {}) {
  if (!row) return null;
  const district = alignedDistrict(row[1]);
  const state = row[2];
  const lat = row[3];
  const lng = row[4];
  const city = alignedCity(row[0], district);
  return {
    pin,
    pinCode: pin,
    city,
    district,
    state,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    locality: city,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${pin} ${city} ${state} India`
    )}`,
    ...extra,
  };
}

export function lookupPin(value) {
  const pin = normalizePin(value);
  if (!/^\d{6}$/.test(pin)) return null;
  const data = loadDirectory();
  const exact = data.pins?.[pin];
  if (exact) return unpack(pin, exact);
  const prefix = data.prefix?.[pin.slice(0, 3)];
  if (prefix) return unpack(pin, prefix, { approximate: true });
  return null;
}

export function listCityDistrictMismatches() {
  const data = loadDirectory();
  const districtsByState = new Map();
  for (const row of Object.values(data.pins || {})) {
    const district = alignedDistrict(row[1]);
    const state = row[2];
    if (!district || !state) continue;
    const set = districtsByState.get(state) || new Set();
    set.add(normName(district));
    districtsByState.set(state, set);
  }

  const mismatches = [];
  for (const [pin, row] of Object.entries(data.pins || {})) {
    const district = alignedDistrict(row[1]);
    const city = alignedCity(row[0], district);
    const state = row[2];
    if (!city || !district) continue;
    if (normName(city) === normName(district)) continue;
    if (DISTRICT_CITY[normName(district)] === city) continue;
    const otherDistricts = districtsByState.get(state);
    if (otherDistricts?.has(normName(city))) {
      mismatches.push({ pin, city, district, state });
    }
  }
  return mismatches;
}

export function pinDirectoryStats() {
  const data = loadDirectory();
  return {
    pinCount: Object.keys(data.pins || {}).length,
    prefixCount: Object.keys(data.prefix || {}).length,
    source: data.source || "",
  };
}
