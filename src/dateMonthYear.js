import { daysInMonth, joinIsoDate, MONTH_OPTIONS, splitIsoDate } from "./personFields.js";

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
  const m = Number(month);
  if (!m) return [];
  const min = splitIsoDate(minIso);
  const max = splitIsoDate(maxIso);
  const y =
    Number(year) ||
    (min.year && min.year === max.year ? Number(min.year) : 0);
  const count = daysInMonth(month, y || year);
  const days = [];
  for (let day = 1; day <= count; day += 1) {
    if (
      y &&
      min.year &&
      y === Number(min.year) &&
      m === Number(min.month) &&
      day < Number(min.day)
    ) {
      continue;
    }
    if (
      y &&
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

export function constrainDateParts(parts = {}, minIso = "", maxIso = "") {
  let year = String(parts.year || "");
  let month = String(parts.month || "");
  let day = String(parts.day || "");

  const months = monthsInRange(minIso, maxIso, year);
  if (month && !months.some((row) => String(row.value) === month)) {
    month = "";
    day = "";
  }

  const days = daysInRange(minIso, maxIso, year, month);
  if (day && !days.includes(Number(day))) {
    day = "";
  }

  const iso = joinIsoDate(day, month, year);
  if (iso && minIso && iso < minIso) {
    return { day: "", month, year, iso: "" };
  }
  if (iso && maxIso && iso > maxIso) {
    return { day: "", month, year, iso: "" };
  }
  return { day, month, year, iso };
}
