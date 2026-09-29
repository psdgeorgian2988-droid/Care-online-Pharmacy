import { orderPayableRupees } from "./partnerCollect.js";
import { TZ, formatInr, orderTimeMs } from "./salesReport.js";

export function pharmacyReportDayKey(ms, now = Date.now()) {
  const at = Number(ms) > 0 ? Number(ms) : now;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

export function pharmacyReportDayLabel(dayKey) {
  const [year, month, day] = String(dayKey || "")
    .split("-")
    .map((part) => Number(part));
  if (!year || !month || !day) return String(dayKey || "—");
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 6)));
}

export function isPharmacyReportOrder(order) {
  const status = String(order?.trackStatus || "").toLowerCase();
  const confirm = String(order?.partnerConfirmStatus || "").toLowerCase();
  if (status === "declined" || confirm === "declined") return false;
  return true;
}

export function pharmacyOrderValue(order) {
  return Math.max(0, Number(orderPayableRupees(order) || 0));
}

export function buildPharmacyReport(orders = [], now = Date.now()) {
  const list = (Array.isArray(orders) ? orders : []).filter(isPharmacyReportOrder);
  const byDay = new Map();
  for (const order of list) {
    const day = pharmacyReportDayKey(orderTimeMs(order), now);
    const current = byDay.get(day) || { day, count: 0, value: 0 };
    current.count += 1;
    current.value += pharmacyOrderValue(order);
    byDay.set(day, current);
  }
  const days = [...byDay.values()]
    .sort((a, b) => String(b.day).localeCompare(String(a.day)))
    .map((row) => ({
      ...row,
      label: pharmacyReportDayLabel(row.day),
      value: Math.round(row.value * 100) / 100,
    }));
  const todayKey = pharmacyReportDayKey(now, now);
  const today = days.find((row) => row.day === todayKey) || {
    day: todayKey,
    label: pharmacyReportDayLabel(todayKey),
    count: 0,
    value: 0,
  };
  const tillDate = days.reduce(
    (sum, row) => ({
      count: sum.count + row.count,
      value: Math.round((sum.value + row.value) * 100) / 100,
    }),
    { count: 0, value: 0 }
  );
  return {
    days,
    today,
    tillDate,
    todayKey,
  };
}

export function formatPharmacyReportValue(amount) {
  return formatInr(amount);
}
