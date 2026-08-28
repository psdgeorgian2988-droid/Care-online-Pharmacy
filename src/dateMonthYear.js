import { daysInMonth, MONTH_OPTIONS, splitIsoDate } from "./personFields.js";

export function clampIsoDate(iso, minIso = "", maxIso = "") {
  const value = String(iso || "").trim();
  if (!value) return "";
  if (minIso && value < minIso) return minIso;
  if (maxIso && value > maxIso) return maxIso;
  return value;
}

export function monthsInRange(minIso, maxIso, year) {
  const y = Number(year);
  const min = splitIsoDate(minIso);
  const max = splitIsoDate(maxIso);
  const minY = Number(min.year) || 0;
  const maxY = Number(max.year) || 0;
  const minM = Number(min.month) || 1;
  const maxM = Number(max.month) || 12;

  return MONTH_OPTIONS.filter((option) => {
    const month = Number(option.value);
    if (y) {
      if (minY && y === minY && month < minM) return false;
      if (maxY && y === maxY && month > maxM) return false;
      return true;
    }
    if (!minY && !maxY) return true;
    if (minY === maxY) return month >= minM && month <= maxM;
    if (maxY - minY >= 2) return true;
    return month >= minM || month <= maxM;
  });
}

export function daysInRange(minIso, maxIso, year, month) {
  const min = splitIsoDate(minIso);
  const max = splitIsoDate(maxIso);
  const y =
    Number(year) ||
    (min.year && min.year === max.year ? Number(min.year) : 0);
  const m = Number(month);
  const count = daysInMonth(month, y || year);
  const days = [];
  for (let day = 1; day <= count; day += 1) {
    if (
      y &&
      m &&
      min.year &&
      y === Number(min.year) &&
      m === Number(min.month) &&
      day < Number(min.day)
    ) {
      continue;
    }
    if (
      y &&
      m &&
      max.year &&
      y === Number(max.year) &&
      m === Number(max.month) &&
      day > Number(max.day)
    ) {
      continue;
    }
    days.push(day);
  }
  return days;
}
