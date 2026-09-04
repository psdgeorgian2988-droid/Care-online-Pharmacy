import { apiFetch } from "./apiBase.js";
import { isNativeRuntime } from "./appRuntime.js";

const PIN3 = {
  110: [28.6139, 77.209, "New Delhi"],
  121: [28.4089, 77.3178, "Faridabad"],
  122: [28.4595, 77.0266, "Gurugram"],
  124: [28.8955, 76.6066, "Rohtak"],
  132: [29.6857, 76.9905, "Karnal"],
  133: [30.3782, 76.7767, "Ambala"],
  134: [30.6942, 76.8606, "Panchkula"],
  136: [29.9695, 76.8783, "Kurukshetra"],
  141: [30.901, 75.8573, "Ludhiana"],
  143: [31.634, 74.8723, "Amritsar"],
  144: [31.326, 75.5762, "Jalandhar"],
  147: [30.3398, 76.3869, "Patiala"],
  160: [30.7333, 76.7794, "Chandigarh"],
  171: [31.1048, 77.1734, "Shimla"],
  173: [30.908, 76.988, "Solan"],
  175: [31.708, 76.932, "Mandi"],
  180: [32.7266, 74.857, "Jammu"],
  190: [34.0837, 74.7973, "Srinagar"],
  201: [28.6692, 77.4538, "Ghaziabad"],
  203: [28.367, 77.541, "Greater Noida"],
  208: [26.4499, 80.3319, "Kanpur"],
  211: [25.4358, 81.8463, "Prayagraj"],
  221: [25.3176, 82.9739, "Varanasi"],
  226: [26.8467, 80.9462, "Lucknow"],
  243: [28.367, 79.4304, "Bareilly"],
  250: [28.9845, 77.7064, "Meerut"],
  273: [26.7606, 83.3732, "Gorakhpur"],
  282: [27.1767, 78.0081, "Agra"],
  302: [26.9124, 75.7873, "Jaipur"],
  305: [26.4499, 74.6399, "Ajmer"],
  313: [24.5854, 73.7125, "Udaipur"],
  324: [25.2138, 75.8648, "Kota"],
  334: [28.0229, 73.3119, "Bikaner"],
  342: [26.2389, 73.0243, "Jodhpur"],
  360: [22.3039, 70.8022, "Rajkot"],
  380: [23.0225, 72.5714, "Ahmedabad"],
  390: [22.3072, 73.1812, "Vadodara"],
  395: [21.1702, 72.8311, "Surat"],
  400: [19.076, 72.8777, "Mumbai"],
  401: [19.2183, 72.9781, "Thane"],
  403: [15.4909, 73.8278, "Goa"],
  411: [18.5204, 73.8567, "Pune"],
  422: [19.9975, 73.7898, "Nashik"],
  431: [19.8762, 75.3433, "Aurangabad"],
  440: [21.1458, 79.0882, "Nagpur"],
  452: [22.7196, 75.8577, "Indore"],
  462: [23.2599, 77.4126, "Bhopal"],
  482: [23.1815, 79.9864, "Jabalpur"],
  492: [21.2514, 81.6296, "Raipur"],
  495: [22.0797, 82.1391, "Bilaspur"],
  500: [17.385, 78.4867, "Hyderabad"],
  506: [17.9689, 79.5941, "Warangal"],
  517: [13.6288, 79.4192, "Tirupati"],
  520: [16.5062, 80.648, "Vijayawada"],
  530: [17.6868, 83.2185, "Visakhapatnam"],
  560: [12.9716, 77.5946, "Bengaluru"],
  570: [12.2958, 76.6394, "Mysuru"],
  575: [12.9141, 74.856, "Mangaluru"],
  580: [15.3647, 75.124, "Hubballi"],
  590: [15.8497, 74.4977, "Belagavi"],
  600: [13.0827, 80.2707, "Chennai"],
  620: [10.7905, 78.7047, "Tiruchirappalli"],
  625: [9.9252, 78.1198, "Madurai"],
  641: [11.0168, 76.9558, "Coimbatore"],
  673: [11.2588, 75.7804, "Kozhikode"],
  682: [9.9312, 76.2673, "Kochi"],
  695: [8.5241, 76.9366, "Thiruvananthapuram"],
  700: [22.5726, 88.3639, "Kolkata"],
  711: [22.5958, 88.2636, "Howrah"],
  713: [23.5204, 87.3119, "Durgapur"],
  721: [22.4309, 87.3215, "Kharagpur"],
  734: [26.7271, 88.3953, "Siliguri"],
  737: [27.3389, 88.6065, "Gangtok"],
  751: [20.2961, 85.8245, "Bhubaneswar"],
  753: [20.4625, 85.883, "Cuttack"],
  760: [19.3133, 84.7941, "Berhampur"],
  769: [22.2604, 84.8536, "Rourkela"],
  781: [26.1445, 91.7362, "Guwahati"],
  785: [26.7509, 94.2037, "Jorhat"],
  786: [27.4728, 94.912, "Dibrugarh"],
  790: [27.0844, 93.6053, "Itanagar"],
  793: [25.5788, 91.8933, "Shillong"],
  795: [24.817, 93.9368, "Imphal"],
  796: [23.7271, 92.7176, "Aizawl"],
  797: [25.6751, 94.1086, "Kohima"],
  799: [23.8315, 91.2868, "Agartala"],
  800: [25.5941, 85.1376, "Patna"],
  813: [25.2425, 86.9842, "Bhagalpur"],
  826: [23.7957, 86.4304, "Dhanbad"],
  831: [22.8046, 86.2029, "Jamshedpur"],
  834: [23.3441, 85.3096, "Ranchi"],
  842: [26.1119, 85.3906, "Muzaffarpur"],
};

const PIN2 = {
  11: [28.6139, 77.209, "Delhi"],
  12: [28.4595, 77.0266, "Haryana"],
  13: [30.3782, 76.7767, "Haryana / Punjab"],
  14: [30.901, 75.8573, "Punjab"],
  15: [30.2109, 74.9455, "Punjab"],
  16: [30.7333, 76.7794, "Chandigarh"],
  17: [31.1048, 77.1734, "Himachal Pradesh"],
  18: [32.7266, 74.857, "Jammu"],
  19: [34.0837, 74.7973, "Kashmir"],
  20: [28.6692, 77.4538, "Uttar Pradesh"],
  21: [25.4358, 81.8463, "Uttar Pradesh"],
  22: [26.8467, 80.9462, "Uttar Pradesh"],
  23: [25.3176, 82.9739, "Uttar Pradesh"],
  24: [28.367, 79.4304, "Uttar Pradesh"],
  25: [28.9845, 77.7064, "Uttar Pradesh"],
  26: [27.8974, 78.088, "Uttar Pradesh"],
  27: [26.7606, 83.3732, "Uttar Pradesh"],
  28: [27.1767, 78.0081, "Uttar Pradesh"],
  30: [26.9124, 75.7873, "Rajasthan"],
  31: [24.5854, 73.7125, "Rajasthan"],
  32: [25.2138, 75.8648, "Rajasthan"],
  33: [28.0229, 73.3119, "Rajasthan"],
  34: [26.2389, 73.0243, "Rajasthan"],
  36: [22.3039, 70.8022, "Gujarat"],
  37: [23.2156, 72.6369, "Gujarat"],
  38: [23.0225, 72.5714, "Gujarat"],
  39: [22.3072, 73.1812, "Gujarat"],
  40: [19.076, 72.8777, "Maharashtra"],
  41: [18.5204, 73.8567, "Maharashtra"],
  42: [19.9975, 73.7898, "Maharashtra"],
  43: [19.8762, 75.3433, "Maharashtra"],
  44: [21.1458, 79.0882, "Maharashtra"],
  45: [22.7196, 75.8577, "Madhya Pradesh"],
  46: [23.2599, 77.4126, "Madhya Pradesh"],
  47: [26.2183, 78.1828, "Madhya Pradesh"],
  48: [23.1815, 79.9864, "Madhya Pradesh"],
  49: [21.2514, 81.6296, "Chhattisgarh"],
  50: [17.385, 78.4867, "Telangana"],
  51: [14.4426, 79.9865, "Andhra Pradesh"],
  52: [16.5062, 80.648, "Andhra Pradesh"],
  53: [17.6868, 83.2185, "Andhra Pradesh"],
  56: [12.9716, 77.5946, "Karnataka"],
  57: [12.2958, 76.6394, "Karnataka"],
  58: [15.3647, 75.124, "Karnataka"],
  59: [15.8497, 74.4977, "Karnataka"],
  60: [13.0827, 80.2707, "Tamil Nadu"],
  61: [10.7905, 78.7047, "Tamil Nadu"],
  62: [10.7905, 78.7047, "Tamil Nadu"],
  63: [9.9252, 78.1198, "Tamil Nadu"],
  64: [11.0168, 76.9558, "Tamil Nadu"],
  67: [11.2588, 75.7804, "Kerala"],
  68: [9.9312, 76.2673, "Kerala"],
  69: [8.5241, 76.9366, "Kerala"],
  70: [22.5726, 88.3639, "West Bengal"],
  71: [22.5958, 88.2636, "West Bengal"],
  72: [22.4309, 87.3215, "West Bengal"],
  73: [26.7271, 88.3953, "West Bengal / Sikkim"],
  74: [23.1645, 88.7749, "West Bengal"],
  75: [20.2961, 85.8245, "Odisha"],
  76: [19.3133, 84.7941, "Odisha"],
  77: [21.4669, 83.9812, "Odisha"],
  78: [26.1445, 91.7362, "Assam"],
  79: [25.5788, 91.8933, "North East"],
  80: [25.5941, 85.1376, "Bihar"],
  81: [24.7914, 85.0002, "Bihar / Jharkhand"],
  82: [23.3441, 85.3096, "Jharkhand"],
  83: [22.8046, 86.2029, "Jharkhand"],
  84: [26.1119, 85.3906, "Bihar"],
  85: [25.2425, 86.9842, "Bihar"],
};

export function normalizePin(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

export function mapsUrlForPin(pin) {
  const code = normalizePin(pin);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    code ? `${code} India` : "India"
  )}`;
}

export function osmEmbedUrl(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const pad = 0.045;
  const minLng = lng - pad;
  const minLat = lat - pad;
  const maxLng = lng + pad;
  const maxLat = lat + pad;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function lookupOffline(pin) {
  const code = normalizePin(pin);
  const row3 = PIN3[code.slice(0, 3)];
  const row2 = PIN2[code.slice(0, 2)];
  const row = row3 || row2;
  if (!row) return { lat: null, lng: null, locality: "" };
  return { lat: row[0], lng: row[1], locality: row[2] };
}

export function locationFromPinSync(pin) {
  const code = normalizePin(pin);
  const offline = lookupOffline(code);
  return {
    pin: code,
    pinCode: code,
    lat: offline.lat,
    lng: offline.lng,
    locality: offline.locality,
    mapsUrl: mapsUrlForPin(code),
  };
}

export function gpsFieldsFromLocation(location) {
  const loc = location || {};
  const pin = normalizePin(loc.pin || loc.pinCode);
  const lat = Number.isFinite(loc.lat) ? loc.lat : null;
  const lng = Number.isFinite(loc.lng) ? loc.lng : null;
  return {
    pin,
    pinCode: pin || loc.pinCode || "",
    lat,
    lng,
    city: loc.city || "",
    district: loc.district || "",
    state: loc.state || "",
    area: loc.area || "",
    areas: Array.isArray(loc.areas) ? loc.areas : [],
    locality: loc.locality || loc.area || loc.city || "",
    mapsUrl: loc.mapsUrl || mapsUrlForPin(pin),
  };
}

export function pinLocationForDisplay(record) {
  const pin = normalizePin(record?.pin || record?.pinCode);
  if (!pin) {
    return { pin: "", lat: null, lng: null, locality: "", mapsUrl: "", embedUrl: "" };
  }
  const hasCoords =
    Number.isFinite(Number(record?.lat)) && Number.isFinite(Number(record?.lng));
  const fallback = locationFromPinSync(pin);
  const lat = hasCoords ? Number(record.lat) : fallback.lat;
  const lng = hasCoords ? Number(record.lng) : fallback.lng;
  return {
    pin,
    lat,
    lng,
    locality: record?.locality || fallback.locality || "",
    mapsUrl: record?.mapsUrl || fallback.mapsUrl,
    embedUrl: osmEmbedUrl(lat, lng),
  };
}

async function fetchJson(url, timeoutMs = 2200, headers = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

const OSM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MediHome/1.0 (https://medihome.co.in; care@medihome.in)",
};

async function fetchPostalLocality(pin) {
  const data = await fetchJson(`https://api.postalpincode.in/pincode/${pin}`);
  const office = Array.isArray(data) ? data[0]?.PostOffice?.[0] : null;
  if (!office) return "";
  return [office.Name, office.District, office.State].filter(Boolean).join(", ");
}

async function fetchNominatim(pin) {
  const data = await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&postalcode=${pin}`,
    8000,
    OSM_HEADERS
  );
  let hit = Array.isArray(data) ? data[0] : null;
  if (!hit) {
    const fallback = await fetchJson(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        `${pin}, India`
      )}`,
      8000,
      OSM_HEADERS
    );
    hit = Array.isArray(fallback) ? fallback[0] : null;
  }
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    locality: String(hit.display_name || "").split(",").slice(0, 3).join(", "),
  };
}

const pinDirectoryCache = new Map();

export async function lookupPinDirectory(pin) {
  const code = normalizePin(pin);
  if (!/^\d{6}$/.test(code)) return null;
  if (pinDirectoryCache.has(code)) return pinDirectoryCache.get(code);
  try {
    const response = await apiFetch(`/api/pincode/${code}`);
    if (!response.ok) {
      pinDirectoryCache.set(code, null);
      return null;
    }
    const data = await response.json();
    const row = data?.city ? data : null;
    pinDirectoryCache.set(code, row);
    return row;
  } catch {
    return null;
  }
}

export function suggestedAreaFromAddress(address = {}, areas = []) {
  const candidates = [
    address.suburb,
    address.neighbourhood,
    address.village,
    address.hamlet,
    address.residential,
    address.city_district,
    address.quarter,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const keys = areas.map((name) => ({
    name,
    key: String(name).toLowerCase().replace(/[^a-z0-9]+/g, ""),
  }));
  for (const candidate of candidates) {
    const key = candidate.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const hit = keys.find(
      (row) => row.key === key || row.key.includes(key) || key.includes(row.key)
    );
    if (hit) return hit.name;
  }
  return candidates[0] || "";
}

const NEAR_PIN_MAX_KM = 12;

/**
 * Prefer a verified map postcode over geometric nearest.
 * PIN centroids in India are often shared across offices, so distance-only
 * matching frequently picks a neighbouring code.
 */
export function chooseDetectedPin({ postcode, nearest, maxNearestKm = NEAR_PIN_MAX_KM } = {}) {
  const code = normalizePin(postcode);
  const nearPin = normalizePin(nearest?.pin || nearest?.pinCode);
  const postOk = /^\d{6}$/.test(code);
  const nearOk = /^\d{6}$/.test(nearPin);
  const nearKm = Number(nearest?.distanceKm);
  const nearClose = nearOk && (!Number.isFinite(nearKm) || nearKm <= maxNearestKm);

  if (postOk) return { pin: code, source: "postcode" };
  if (nearClose) return { pin: nearPin, source: nearest?.source || "nearest" };
  if (nearOk) return { pin: nearPin, source: nearest?.source || "nearest" };
  return null;
}

export function locationErrorMessage(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  if (
    code.includes("0007") ||
    code.includes("0009") ||
    code.includes("0016") ||
    /not enabled|location settings|enable location/i.test(message)
  ) {
    return "Turn on Location in Android settings, then tap Use My Location.";
  }
  if (
    code.includes("0003") ||
    /denied|permission|not declared in manifest|0018/i.test(`${code} ${message}`)
  ) {
    return "Allow location access to fill the PIN Code.";
  }
  if (code.includes("0010") || /timeout|in time/i.test(message)) {
    return "Could not lock GPS in time. Move outdoors, or enter the PIN Code.";
  }
  if (code.includes("0014") || code.includes("0015") || /play services/i.test(message)) {
    return "Install or update Google Play Services, then try Use My Location again.";
  }
  if (code.includes("0017") || /network and location/i.test(message)) {
    return "Turn on Location and mobile data or Wi-Fi, then try again.";
  }
  if (code.includes("0002") || /error trying to obtain the location/i.test(message)) {
    return "Could not read your location. Please enter the PIN Code.";
  }
  if (/emulator|extended controls|no gps fix/i.test(message)) {
    return message;
  }
  return message || "Could not read your location. Please enter the PIN Code.";
}

function coordsFromPosition(position) {
  const lat = Number(position?.coords?.latitude);
  const lng = Number(position?.coords?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // Null Island / unset emulator location
  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return null;
  return { lat, lng };
}

function readBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = coordsFromPosition(position);
        if (!coords) {
          reject(
            new Error(
              "No GPS fix yet. On an Android emulator, set a location under Extended controls → Location, then try again. Or enter the PIN Code."
            )
          );
          return;
        }
        resolve(coords);
      },
      (error) => {
        if (error?.code === 1) {
          reject(new Error("Allow location access to fill the PIN Code."));
          return;
        }
        if (error?.code === 3) {
          reject(
            new Error("Could not lock GPS in time. Move outdoors, or enter the PIN Code.")
          );
          return;
        }
        if (error?.code === 2) {
          reject(
            new Error(
              "Location is unavailable. Turn on Location, or enter the PIN Code."
            )
          );
          return;
        }
        reject(new Error("Could not read your location. Please enter the PIN Code."));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

async function watchNativeLocation(Geolocation, options, waitMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let watchId = "";
    const finish = (error, position) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (watchId) Geolocation.clearWatch({ id: watchId }).catch(() => {});
      if (position) resolve(position);
      else {
        reject(
          error ||
            new Error(
              "Could not lock GPS in time. Move outdoors, or enter the PIN Code."
            )
        );
      }
    };
    const timer = window.setTimeout(
      () => finish(new Error("Could not obtain location in time.")),
      waitMs
    );
    Geolocation.watchPosition(options, (position, error) => {
      if (position) finish(null, position);
      else if (error) finish(error);
    })
      .then((id) => {
        watchId = id;
      })
      .catch((error) => finish(error));
  });
}

function hasLocationPermission(status) {
  return status?.location === "granted" || status?.coarseLocation === "granted";
}

async function ensureNativeLocationPermission(Geolocation) {
  let status;
  try {
    status = await Geolocation.checkPermissions();
  } catch (error) {
    // Throws when system location services are disabled (OS-PLUG-GLOC-0007).
    throw new Error(locationErrorMessage(error));
  }

  if (hasLocationPermission(status)) return;

  try {
    // On Android this requests ACCESS_FINE_LOCATION + ACCESS_COARSE_LOCATION.
    status = await Geolocation.requestPermissions({
      permissions: ["location"],
    });
  } catch (error) {
    throw new Error(locationErrorMessage(error));
  }

  if (hasLocationPermission(status)) return;

  // Android 12+ may grant approximate only; request coarse explicitly.
  try {
    status = await Geolocation.requestPermissions({
      permissions: ["coarseLocation"],
    });
  } catch (error) {
    throw new Error(locationErrorMessage(error));
  }

  if (!hasLocationPermission(status)) {
    throw new Error("Allow location access to fill the PIN Code.");
  }
}

async function readNativeLocation() {
  let Geolocation;
  try {
    ({ Geolocation } = await import("@capacitor/geolocation"));
  } catch {
    throw new Error(
      "Location plugin is unavailable. Please enter the PIN Code."
    );
  }

  await ensureNativeLocationPermission(Geolocation);

  const attempts = [
    {
      enableHighAccuracy: true,
      timeout: 25000,
      maximumAge: 0,
      enableLocationFallback: true,
    },
    {
      enableHighAccuracy: false,
      timeout: 25000,
      maximumAge: 15000,
      enableLocationFallback: true,
    },
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 60000,
      enableLocationFallback: true,
    },
  ];

  let lastError;
  let sawInvalidCoords = false;

  for (const options of attempts) {
    try {
      const position = await Geolocation.getCurrentPosition(options);
      const coords = coordsFromPosition(position);
      if (coords) return coords;
      sawInvalidCoords = true;
    } catch (error) {
      lastError = error;
      const code = String(error?.code || "");
      // Hard failures: do not keep retrying.
      if (
        code.includes("0003") ||
        code.includes("0007") ||
        code.includes("0009") ||
        code.includes("0017") ||
        code.includes("0018")
      ) {
        throw new Error(locationErrorMessage(error));
      }
    }
  }

  try {
    const position = await watchNativeLocation(
      Geolocation,
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
        enableLocationFallback: true,
        interval: 2000,
        minimumUpdateInterval: 1000,
      },
      28000
    );
    const coords = coordsFromPosition(position);
    if (coords) return coords;
    sawInvalidCoords = true;
  } catch (error) {
    lastError = error;
  }

  if (sawInvalidCoords && !lastError) {
    throw new Error(
      "No GPS fix yet. On an Android emulator, set a location under Extended controls → Location, then try again. Or enter the PIN Code."
    );
  }

  throw new Error(locationErrorMessage(lastError));
}

async function readDeviceLocation() {
  // Prefer Capacitor Geolocation on Android/iOS so runtime permissions work.
  const native =
    isNativeRuntime() ||
    Boolean(globalThis.Capacitor?.isNativePlatform?.()) ||
    Boolean(globalThis.Capacitor?.isNative);
  if (native) {
    return readNativeLocation();
  }
  return readBrowserLocation();
}

async function fetchNearestPin(lat, lng) {
  try {
    const response = await apiFetch(
      `/api/pincode/near?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.pin || data?.pinCode ? data : null;
  } catch {
    return null;
  }
}

function normalizeReverseAddress(raw = {}) {
  return {
    postcode: normalizePin(raw.postcode || raw.postalCode || raw.zip || ""),
    suburb: String(raw.suburb || "").trim(),
    neighbourhood: String(raw.neighbourhood || raw.neighborhood || "").trim(),
    village: String(raw.village || "").trim(),
    hamlet: String(raw.hamlet || "").trim(),
    residential: String(raw.residential || "").trim(),
    city_district: String(raw.city_district || raw.cityDistrict || "").trim(),
    quarter: String(raw.quarter || "").trim(),
    locality: String(raw.locality || raw.city || raw.town || raw.county || "").trim(),
    area: String(
      raw.suburb ||
        raw.neighbourhood ||
        raw.neighborhood ||
        raw.village ||
        raw.hamlet ||
        raw.residential ||
        raw.locality ||
        ""
    ).trim(),
  };
}

async function fetchReverseAddress(lat, lng) {
  const nominatim = await fetchJson(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
    10000,
    OSM_HEADERS
  );
  let address = normalizeReverseAddress(nominatim?.address || {});

  if (!/^\d{6}$/.test(address.postcode) || !address.area) {
    const cloud = await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`,
      10000
    );
    if (cloud) {
      const cloudAddress = normalizeReverseAddress({
        postcode: cloud.postcode,
        locality: cloud.locality || cloud.city || cloud.localityInfo?.administrative?.[0]?.name,
        suburb: cloud.localityInfo?.informative?.find?.((row) => /suburb|neighbour|sector|village/i.test(row.description || row.name || ""))?.name,
        neighbourhood: cloud.locality,
        village: cloud.locality,
      });
      if (!/^\d{6}$/.test(address.postcode) && /^\d{6}$/.test(cloudAddress.postcode)) {
        address.postcode = cloudAddress.postcode;
      }
      if (!address.area && cloudAddress.area) {
        address = { ...address, ...cloudAddress, postcode: address.postcode || cloudAddress.postcode };
      } else if (!address.locality && cloudAddress.locality) {
        address.locality = cloudAddress.locality;
      }
    }
  }
  return address.postcode || address.area || address.locality ? address : null;
}

async function resolvePinFromHints(lat, lng, address = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (address.postcode) params.set("postcode", address.postcode);
  if (address.area) params.set("area", address.area);
  if (address.suburb) params.set("suburb", address.suburb);
  if (address.neighbourhood) params.set("neighbourhood", address.neighbourhood);
  if (address.village) params.set("village", address.village);
  if (address.locality) params.set("locality", address.locality);
  try {
    const response = await apiFetch(`/api/pincode/resolve?${params}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.pin || data?.pinCode ? data : null;
  } catch {
    return null;
  }
}

export async function detectPinFromLocation() {
  const coords = await readDeviceLocation();
  const address = await fetchReverseAddress(coords.lat, coords.lng);
  let resolved = await resolvePinFromHints(coords.lat, coords.lng, address || {});

  // Live site may not have /api/pincode/resolve yet — prefer the map postcode
  // over geometric nearest, because India PIN centroids are often shared/wrong.
  if (!resolved && address?.postcode) {
    const byPost = await lookupPinDirectory(address.postcode);
    if (byPost?.city) {
      resolved = { ...byPost, source: "postcode", fromLocation: true };
    }
  }
  if (!resolved) {
    resolved = await fetchNearestPin(coords.lat, coords.lng);
  }
  if (!resolved?.pin && !resolved?.pinCode) {
    throw new Error("Could not detect a PIN Code from this location.");
  }
  const pin = normalizePin(resolved.pin || resolved.pinCode);
  const directory = (await lookupPinDirectory(pin)) || resolved;
  return {
    pin,
    pinCode: pin,
    source: resolved.source || "nearest",
    lat: coords.lat,
    lng: coords.lng,
    suggestedArea: suggestedAreaFromAddress(
      address,
      directory?.areas || resolved?.areas || []
    ),
    city: directory?.city || resolved?.city || "",
    district: directory?.district || resolved?.district || "",
    state: directory?.state || resolved?.state || "",
  };
}

export async function resolvePinLocation(pin) {
  const base = locationFromPinSync(pin);
  if (!/^\d{6}$/.test(base.pin)) return base;

  const directory = await lookupPinDirectory(base.pin);
  if (directory) {
    return gpsFieldsFromLocation({
      ...base,
      ...directory,
      locality: directory.locality || directory.city || base.locality,
    });
  }

  const [postal, nominatim] = await Promise.all([
    fetchPostalLocality(base.pin),
    fetchNominatim(base.pin),
  ]);

  return gpsFieldsFromLocation({
    ...base,
    lat: nominatim?.lat ?? base.lat,
    lng: nominatim?.lng ?? base.lng,
    locality: postal || nominatim?.locality || base.locality,
  });
}
