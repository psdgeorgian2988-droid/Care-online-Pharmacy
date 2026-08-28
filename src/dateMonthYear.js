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
  return MONTH_OPTIONS.filter((option) => {
    const month = Number(option.value);
    if (y && min.year && y === Number(min.year) && month < Number(min.month)) {
      return false;
    }
    if (y && max.year && y === Number(max.year) && month > Number(max.month)) {
      return false;
    }
    return true;
  });
}

export function daysInRange(minIso, maxIso, year, month) {
  const count = daysInMonth(month, year);
  const y = Number(year);
  const m = Number(month);
  const min = splitIsoDate(minIso);
  const max = splitIsoDate(maxIso);
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
