import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = process.argv[2] || "/tmp/pincodes/IN.txt";
const OUTPUT = path.join(ROOT, "server/data/pincodes.json");

const CITY_BY_PREFIX = {
  110: "New Delhi",
  121: "Faridabad",
  122: "Gurugram",
  124: "Rohtak",
  132: "Karnal",
  133: "Ambala",
  134: "Panchkula",
  136: "Kurukshetra",
  141: "Ludhiana",
  143: "Amritsar",
  144: "Jalandhar",
  147: "Patiala",
  160: "Chandigarh",
  171: "Shimla",
  173: "Solan",
  175: "Mandi",
  180: "Jammu",
  190: "Srinagar",
  201: "Ghaziabad",
  203: "Greater Noida",
  208: "Kanpur",
  211: "Prayagraj",
  221: "Varanasi",
  226: "Lucknow",
  243: "Bareilly",
  250: "Meerut",
  273: "Gorakhpur",
  282: "Agra",
  302: "Jaipur",
  305: "Ajmer",
  313: "Udaipur",
  324: "Kota",
  334: "Bikaner",
  342: "Jodhpur",
  360: "Rajkot",
  380: "Ahmedabad",
  390: "Vadodara",
  395: "Surat",
  400: "Mumbai",
  401: "Thane",
  403: "Goa",
  411: "Pune",
  422: "Nashik",
  431: "Aurangabad",
  440: "Nagpur",
  452: "Indore",
  462: "Bhopal",
  482: "Jabalpur",
  492: "Raipur",
  495: "Bilaspur",
  500: "Hyderabad",
  506: "Warangal",
  517: "Tirupati",
  520: "Vijayawada",
  530: "Visakhapatnam",
  560: "Bengaluru",
  570: "Mysuru",
  575: "Mangaluru",
  580: "Hubballi",
  590: "Belagavi",
  600: "Chennai",
  620: "Tiruchirappalli",
  625: "Madurai",
  641: "Coimbatore",
  673: "Kozhikode",
  682: "Kochi",
  695: "Thiruvananthapuram",
  700: "Kolkata",
  711: "Howrah",
  713: "Durgapur",
  721: "Kharagpur",
  734: "Siliguri",
  737: "Gangtok",
  751: "Bhubaneswar",
  753: "Cuttack",
  760: "Berhampur",
  769: "Rourkela",
  781: "Guwahati",
  785: "Jorhat",
  786: "Dibrugarh",
  790: "Itanagar",
  793: "Shillong",
  795: "Imphal",
  796: "Aizawl",
  797: "Kohima",
  799: "Agartala",
  800: "Patna",
  813: "Bhagalpur",
  826: "Dhanbad",
  831: "Jamshedpur",
  834: "Ranchi",
  842: "Muzaffarpur",
};

function titleCase(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text === "NA" || text === "N/A") return "";
  if (text !== text.toUpperCase()) return text;
  return text
    .toLowerCase()
    .replace(/(^|[\s/&-])([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

function normName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

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

function cityFor(pin, district) {
  const districtKey = normName(district);
  if (DISTRICT_CITY[districtKey]) return DISTRICT_CITY[districtKey];
  const prefixCity = CITY_BY_PREFIX[pin.slice(0, 3)];
  if (prefixCity && normName(prefixCity) === districtKey) return prefixCity;
  return district;
}

function displayDistrict(district) {
  return normName(district) === "gurgaon" ? "Gurugram" : district;
}

function cleanPlace(name) {
  return titleCase(
    String(name || "")
      .replace(/\s*\(([^)]*)\)/g, " $1 ")
      .replace(/\s+(H\.?O\.?|S\.?O\.?|B\.?O\.?|G\.?P\.?O\.?|P\.?O\.?)\.?$/i, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function isOfficeName(name) {
  return /\b(h\.?o\.?|g\.?p\.?o\.?|s\.?o\.?)\b/i.test(name);
}

function isBuildingName(name) {
  return /college|university|hospital|court|bus stand|stock exchange|vidhana|rajbhavan|highcourt|school|campus|bhawan|temple|church|factory|industrial area|n\.?i\.?f\.?m|m\.?p\.?t/i.test(
    name
  );
}

function isLocalAreaName(name) {
  return /sector|sec[-\s.]?\d|phase\s*\d|south city|dwarka|mohalla|colony|nagar|enclave|vihar|village|gaon|was$|heri$|hera$|patti|kunj|bagh|market|bazar|gate|road|pur$|wali$|garh$/i.test(
    name
  );
}

function areaScore(place, taluk) {
  const raw = String(place.name || "");
  const name = place.clean;
  if (!name) return -100;
  let score = 0;
  if (isLocalAreaName(name)) score += 14;
  if (isOfficeName(raw) && /s\.?o/i.test(raw) && !/h\.?o|g\.?p\.?o/i.test(raw)) {
    score += 8;
  }
  if (isOfficeName(raw) && /h\.?o|g\.?p\.?o/i.test(raw)) score -= 12;
  if (isBuildingName(name)) score -= 10;
  if (place.acc === "3") score += 3;
  if (taluk && normName(name) === normName(taluk)) score += 6;
  if (name.length <= 18) score += 1;
  return score;
}

function uniquePlaces(places) {
  const seen = new Set();
  const list = [];
  for (const place of places) {
    const key = normName(place.clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(place.clean);
  }
  return list.sort((a, b) => a.localeCompare(b));
}

function pickArea(places, taluk, city) {
  const usable = places.filter((place) => place.clean);
  if (!usable.length) return city;
  let best = usable[0];
  let bestScore = -Infinity;
  for (const place of usable) {
    const score = areaScore(place, taluk);
    if (score > bestScore) {
      best = place;
      bestScore = score;
    }
  }
  return best.clean || city;
}

function majority(values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function roundCoord(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

const grouped = new Map();
const stream = createReadStream(INPUT, { encoding: "utf8" });
for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
  if (!line) continue;
  const parts = line.split("\t");
  const pin = String(parts[1] || "").replace(/\D/g, "").slice(0, 6);
  if (!/^\d{6}$/.test(pin)) continue;
  const state = titleCase(parts[3]);
  const district = titleCase(parts[5]);
  const lat = Number(parts[9]);
  const lng = Number(parts[10]);
  const taluk = titleCase(parts[7]);
  const acc = String(parts[11] || "").trim();
  const placeName = String(parts[2] || "").trim();
  const row = grouped.get(pin) || {
    districts: [],
    states: [],
    taluks: [],
    places: [],
    lats: [],
    lngs: [],
  };
  if (district) row.districts.push(district);
  if (state) row.states.push(state);
  if (taluk) row.taluks.push(taluk);
  if (placeName) {
    row.places.push({
      name: placeName,
      clean: cleanPlace(placeName),
      acc,
    });
  }
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    row.lats.push(lat);
    row.lngs.push(lng);
  }
  grouped.set(pin, row);
}

const pins = {};
const prefixBuckets = new Map();

for (const [pin, row] of grouped) {
  const district = displayDistrict(majority(row.districts));
  const state = majority(row.states);
  const city = cityFor(pin, district);
  const taluk = majority(row.taluks.filter((value) => value && value !== "Na"));
  const area = pickArea(row.places, taluk, city);
  const areas = uniquePlaces(row.places);
  if (area && !areas.includes(area)) areas.unshift(area);
  if (!city || !district || !state) continue;
  const lat = row.lats.length
    ? roundCoord(row.lats.reduce((sum, value) => sum + value, 0) / row.lats.length)
    : 0;
  const lng = row.lngs.length
    ? roundCoord(row.lngs.reduce((sum, value) => sum + value, 0) / row.lngs.length)
    : 0;
  pins[pin] = [area, city, district, state, lat, lng, areas];
  const prefix = pin.slice(0, 3);
  const bucket = prefixBuckets.get(prefix) || {
    cities: [],
    districts: [],
    states: [],
    lats: [],
    lngs: [],
  };
  bucket.cities.push(city);
  bucket.districts.push(district);
  bucket.states.push(state);
  if (lat) bucket.lats.push(lat);
  if (lng) bucket.lngs.push(lng);
  prefixBuckets.set(prefix, bucket);
}

const prefix = {};
for (const [code, bucket] of prefixBuckets) {
  const district = displayDistrict(majority(bucket.districts));
  const state = majority(bucket.states);
  const city = cityFor(`${code}000`, district);
  prefix[code] = [
    city,
    city,
    district,
    state,
    bucket.lats.length
      ? roundCoord(bucket.lats.reduce((sum, value) => sum + value, 0) / bucket.lats.length)
      : 0,
    bucket.lngs.length
      ? roundCoord(bucket.lngs.reduce((sum, value) => sum + value, 0) / bucket.lngs.length)
      : 0,
  ];
}

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(
  OUTPUT,
  JSON.stringify({
    source: "GeoNames postal codes for India (CC BY 4.0, https://www.geonames.org)",
    pins,
    prefix,
  })
);

console.log(
  `Wrote ${Object.keys(pins).length} PIN codes and ${Object.keys(prefix).length} prefixes to ${OUTPUT}`
);
