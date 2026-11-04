const CODE39 = {
  0: "nnnwwnwnn",
  1: "wnnwnnnnw",
  2: "nnwwnnnnw",
  3: "wnwwnnnnn",
  4: "nnnwwnnnw",
  5: "wnnwwnnnn",
  6: "nnwwwnnnn",
  7: "nnnwnnwnw",
  8: "wnnwnnwnn",
  9: "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "*": "nwnnwnwnn",
};

export function newAccession(order = {}, now = Date.now()) {
  const when = new Date(now);
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, "0");
  const d = String(when.getDate()).padStart(2, "0");
  const kind = String(order.kind || order.orderType || "").toLowerCase() === "radiology" ? "RAD" : "LAB";
  const tail = String(Math.abs(now % 10000)).padStart(4, "0");
  return `MH-${kind}-${y}${m}${d}-${tail}`;
}

export function accessionOf(order = {}, now = Date.now()) {
  const existing = String(order.accessionNo || order.barcodeValue || "").trim();
  return existing || newAccession(order, now);
}

export function barcodeBars(value = "") {
  const raw = String(value || "")
    .toUpperCase()
    .replace(/[^0-9A-Z\-.]/g, "");
  if (!raw) return [];
  const encoded = `*${raw}*`;
  const bars = [];
  let x = 0;
  const narrow = 1;
  const wide = 2.4;
  for (let i = 0; i < encoded.length; i += 1) {
    const pattern = CODE39[encoded[i]];
    if (!pattern) continue;
    for (let bit = 0; bit < pattern.length; bit += 1) {
      const width = pattern[bit] === "w" ? wide : narrow;
      if (bit % 2 === 0) bars.push({ x, width, black: true });
      x += width;
    }
    x += narrow;
  }
  return bars;
}

export function normalizeReportResults(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      name: String(row?.name || "").trim().slice(0, 120),
      value: String(row?.value || "").trim().slice(0, 40),
      unit: String(row?.unit || "").trim().slice(0, 24),
      reference: String(row?.reference || "").trim().slice(0, 40),
      flag: ["high", "low", "normal"].includes(String(row?.flag || "").toLowerCase())
        ? String(row.flag).toLowerCase()
        : "",
    }))
    .filter((row) => row.name)
    .slice(0, 40);
}

export function resultRowsFromOrder(order = {}) {
  const saved = normalizeReportResults(order.reportResults);
  if (saved.length) return saved;
  const names = [
    ...(Array.isArray(order.tests) ? order.tests : []),
    ...(Array.isArray(order.items) ? order.items : []),
  ]
    .map((row) => String(row?.name || row?.testName || "").trim())
    .filter(Boolean);
  return [...new Set(names)].slice(0, 40).map((name) => ({
    name,
    value: "",
    unit: "",
    reference: "",
    flag: "",
  }));
}

export function collectorLocationFields({ lat, lng } = {}, now = Date.now()) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return {
    collectorLat: latitude,
    collectorLng: longitude,
    collectorMapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    collectorLiveAt: now,
    collectorLive: true,
  };
}

export function tubeForTest(name = "") {
  const text = String(name || "");
  if (/urine/i.test(text)) return "Urine";
  if (/stool/i.test(text)) return "Stool";
  if (/sugar|glucose|\bfbs\b|\bppbs\b/i.test(text)) return "Fluoride";
  if (/cbc|esr|blood group|haemoglobin|hemoglobin/i.test(text)) return "EDTA";
  return "Serum";
}

export function buildSampleTubes(order = {}, now = Date.now()) {
  if (Array.isArray(order.samples) && order.samples.length) {
    return order.samples.slice(0, 12).map((row, index) => ({
      id: String(row.id || `${index + 1}`),
      tube: String(row.tube || "Serum").slice(0, 24),
      barcode: String(row.barcode || row.id || "").slice(0, 48),
      tests: Array.isArray(row.tests) ? row.tests.map((name) => String(name).slice(0, 80)).slice(0, 20) : [],
      status: ["collected", "rejected", "redraw"].includes(row.status) ? row.status : "collected",
      reason: String(row.reason || "").slice(0, 160),
    }));
  }
  const names = resultRowsFromOrder(order).map((row) => row.name);
  const groups = new Map();
  for (const name of names.length ? names : ["Sample"]) {
    const tube = names.length ? tubeForTest(name) : "EDTA";
    if (!groups.has(tube)) groups.set(tube, []);
    groups.get(tube).push(name);
  }
  const accession = accessionOf(order, now);
  let n = 1;
  return [...groups.entries()].slice(0, 8).map(([tube, tests]) => {
    const barcode = `${accession}-${n}`;
    n += 1;
    return { id: barcode, tube, barcode, tests, status: "collected", reason: "" };
  });
}

export function parseAnalyzerCsv(text = "") {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].toLowerCase();
  const start = /name|test|analyte/.test(header) ? 1 : 0;
  return normalizeReportResults(
    lines.slice(start).map((line) => {
      const [name, value, unit, reference, flag] = line.split(",").map((cell) => String(cell || "").trim());
      return { name, value, unit, reference, flag };
    })
  );
}

export function collectorHasFix(order = {}) {
  const lat = Number(order.collectorLat);
  const lng = Number(order.collectorLng);
  return Boolean(order.collectorLive) && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}
