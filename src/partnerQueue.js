const PEAK_HOURS = new Set([8, 9, 10, 11, 18, 19, 20, 21, 22]);
const BUSY_OPEN_COUNT = 1;
const BUSY_HOLD_MS = 2400;

const STORES = [
  ["mediHomeOrders", "medicine"],
  ["mediHomeDiagnosticsBookings", "lab"],
  ["mediHomeHomeCareBookings", "homecare"],
  ["mediHomeStepDownBookings", "stepdown"],
  ["mediHomeAmbulanceRequests", "ambulance"],
];

function istHour(now = Date.now()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hourCycle: "h23",
    }).format(now)
  );
  return Number.isFinite(hour) ? hour : new Date(now).getHours();
}

function kindLabel(kind) {
  switch (kind) {
    case "lab":
      return "Laboratory Test";
    case "radiology":
      return "Radiology & Imaging";
    case "homecare":
      return "Home Care";
    case "stepdown":
      return "Step-Down Care";
    case "ambulance":
      return "Ambulance";
    default:
      return "Medicine Order";
  }
}

export function kindFromRecord(row, fallback) {
  const kind = String(row?.kind || row?.orderType || "").toLowerCase();
  if (
    kind === "medicine" ||
    kind === "lab" ||
    kind === "radiology" ||
    kind === "homecare" ||
    kind === "stepdown" ||
    kind === "ambulance"
  ) {
    return kind;
  }
  const service = String(row?.serviceType || "").toLowerCase();
  if (service === "radiology") return "radiology";
  if (service === "lab") return "lab";
  return String(fallback || "");
}

function readBrowserOrders() {
  if (typeof localStorage === "undefined") return [];
  const rows = [];
  for (const [key, fallback] of STORES) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(parsed)) continue;
      for (const row of parsed) {
        rows.push({
          kind: kindFromRecord(row, fallback),
          trackStatus: row.trackStatus || row.status || "",
        });
      }
    } catch {
      /* ignore bad local data */
    }
  }
  return rows;
}

export function isOpenPartnerJob(order) {
  const status = String(order?.trackStatus || "").toLowerCase();
  return status !== "done" && status !== "delivered" && status !== "completed";
}

export function partnerTraffic(kind, orders, now = Date.now()) {
  const key = String(kind || "medicine");
  const list = Array.isArray(orders) ? orders : readBrowserOrders();
  const openCount = list.filter(
    (row) => kindFromRecord(row, row.kind) === key && isOpenPartnerJob(row)
  ).length;
  const peak = PEAK_HOURS.has(istHour(now));
  const busy = openCount >= BUSY_OPEN_COUNT || peak;
  return {
    kind: key,
    label: kindLabel(key),
    openCount,
    peak,
    busy,
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function holdForPartnerQueue(kind, { urgent = false } = {}, orders, now) {
  const traffic = partnerTraffic(kind, orders, now);
  if (urgent || !traffic.busy) {
    return { ...traffic, waited: false };
  }
  await sleep(BUSY_HOLD_MS);
  return { ...traffic, waited: true };
}
