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

function uniqueAreas(list, fallback = "") {
  const seen = new Set();
  const areas = [];
  for (const value of [...list, fallback]) {
    const name = String(value || "").trim();
    const key = normName(name);
    if (!name || !key || seen.has(key)) continue;
    seen.add(key);
    areas.push(name);
  }
  return areas;
}

function unpack(pin, row, extra = {}) {
  if (!row) return null;
  const newFormat = typeof row[3] === "string";
  const areaRaw = newFormat ? row[0] : "";
  const cityRaw = newFormat ? row[1] : row[0];
  const districtRaw = newFormat ? row[2] : row[1];
  const state = newFormat ? row[3] : row[2];
  const lat = newFormat ? row[4] : row[3];
  const lng = newFormat ? row[5] : row[4];
  const storedAreas = newFormat && Array.isArray(row[6]) ? row[6] : [];
  const district = alignedDistrict(districtRaw);
  const city = alignedCity(cityRaw, district);
  const areas = extra.approximate
    ? uniqueAreas([city])
    : uniqueAreas(storedAreas, areaRaw);
  const area = areas.includes(areaRaw) ? areaRaw : areas[0] || "";
  return {
    pin,
    pinCode: pin,
    area,
    areas,
    city,
    district,
    state,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    locality: area || city,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${pin} ${area || city} ${state} India`
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
    const newFormat = typeof row[3] === "string";
    const district = alignedDistrict(newFormat ? row[2] : row[1]);
    const state = newFormat ? row[3] : row[2];
    if (!district || !state) continue;
    const set = districtsByState.get(state) || new Set();
    set.add(normName(district));
    districtsByState.set(state, set);
  }

  const mismatches = [];
  for (const [pin, row] of Object.entries(data.pins || {})) {
    const found = lookupPin(pin);
    if (!found?.city || !found.district) continue;
    if (normName(found.city) === normName(found.district)) continue;
    if (DISTRICT_CITY[normName(found.district)] === found.city) continue;
    const otherDistricts = districtsByState.get(found.state);
    if (otherDistricts?.has(normName(found.city))) {
      mismatches.push({
        pin,
        city: found.city,
        district: found.district,
        state: found.state,
      });
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

export function listExactPins() {
  return Object.keys(loadDirectory().pins || {});
}
