import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data/pincodes.json"
);

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

function unpack(pin, row, extra = {}) {
  if (!row) return null;
  const [city, district, state, lat, lng] = row;
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

export function pinDirectoryStats() {
  const data = loadDirectory();
  return {
    pinCount: Object.keys(data.pins || {}).length,
    prefixCount: Object.keys(data.prefix || {}).length,
    source: data.source || "",
  };
}
