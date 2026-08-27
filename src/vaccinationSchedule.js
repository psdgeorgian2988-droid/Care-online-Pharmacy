/** Government of India National Immunization Schedule (UIP / MoHFW / NHM). */

export const HOME_VISIT_FEE = 499;

export const CHILD_MAX_YEARS = 18;
export const SENIOR_MIN_YEARS = 50;

/** Universal Immunisation Programme — National Immunization Schedule (India). */
export const CHILD_VACCINES = [
  { id: "bcg", name: "BCG", dueAgeWeeks: 0, dueAgeMonths: 0, windowEndMonths: 12, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "At birth. Given intradermally on the left upper arm." },
  { id: "hepb-bd", name: "Hepatitis B — Birth Dose", dueAgeWeeks: 0, dueAgeMonths: 0, windowEndMonths: 0.03, catchUp: false, price: 0, note: "Within 24 hours of birth." },
  { id: "opv-0", name: "OPV-0", dueAgeWeeks: 0, dueAgeMonths: 0, windowEndMonths: 0.5, catchUp: false, price: 0, note: "Oral polio vaccine at birth (as soon as possible after birth)." },
  { id: "opv-1", name: "OPV-1", dueAgeWeeks: 6, dueAgeMonths: 1.5, windowEndMonths: 2.3, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "6 weeks. With Pentavalent-1." },
  { id: "penta-1", name: "Pentavalent-1 (DPT + Hep B + Hib)", dueAgeWeeks: 6, dueAgeMonths: 1.5, windowEndMonths: 2.3, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "6 weeks." },
  { id: "rvv-1", name: "Rotavirus Vaccine (RVV) — 1", dueAgeWeeks: 6, dueAgeMonths: 1.5, windowEndMonths: 2.3, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "6 weeks. Oral." },
  { id: "fipv-1", name: "Fractional IPV (fIPV) — 1", dueAgeWeeks: 6, dueAgeMonths: 1.5, windowEndMonths: 2.3, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "6 weeks. Intradermal." },
  { id: "pcv-1", name: "Pneumococcal Conjugate Vaccine (PCV) — 1", dueAgeWeeks: 6, dueAgeMonths: 1.5, windowEndMonths: 2.3, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "6 weeks. UIP: 2 primary doses + 1 booster." },
  { id: "opv-2", name: "OPV-2", dueAgeWeeks: 10, dueAgeMonths: 2.5, windowEndMonths: 3.3, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "10 weeks." },
  { id: "penta-2", name: "Pentavalent-2", dueAgeWeeks: 10, dueAgeMonths: 2.5, windowEndMonths: 3.3, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "10 weeks." },
  { id: "rvv-2", name: "Rotavirus Vaccine (RVV) — 2", dueAgeWeeks: 10, dueAgeMonths: 2.5, windowEndMonths: 3.3, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "10 weeks." },
  { id: "opv-3", name: "OPV-3", dueAgeWeeks: 14, dueAgeMonths: 3.5, windowEndMonths: 6, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "14 weeks." },
  { id: "penta-3", name: "Pentavalent-3", dueAgeWeeks: 14, dueAgeMonths: 3.5, windowEndMonths: 6, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "14 weeks." },
  { id: "rvv-3", name: "Rotavirus Vaccine (RVV) — 3", dueAgeWeeks: 14, dueAgeMonths: 3.5, windowEndMonths: 6, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "14 weeks." },
  { id: "fipv-2", name: "Fractional IPV (fIPV) — 2", dueAgeWeeks: 14, dueAgeMonths: 3.5, windowEndMonths: 6, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "14 weeks." },
  { id: "pcv-2", name: "Pneumococcal Conjugate Vaccine (PCV) — 2", dueAgeWeeks: 14, dueAgeMonths: 3.5, windowEndMonths: 6, catchUp: true, catchUpUntilMonths: 12, price: 0, note: "14 weeks. Second primary dose (UIP does not give PCV at 10 weeks)." },
  { id: "mr-1", name: "MR-1 (Measles–Rubella)", dueAgeMonths: 9, windowEndMonths: 12, catchUp: true, catchUpUntilMonths: 60, price: 0, note: "9–12 months. Government schedule uses MR, not MMR." },
  { id: "pcv-b", name: "PCV Booster", dueAgeMonths: 9, windowEndMonths: 12, catchUp: true, catchUpUntilMonths: 24, price: 0, note: "9–12 months." },
  { id: "je-1", name: "Japanese Encephalitis (JE) — 1", dueAgeMonths: 9, windowEndMonths: 12, catchUp: true, catchUpUntilMonths: 24, endemicOnly: true, price: 0, note: "9–12 months. Only in JE-endemic districts notified by the Government of India." },
  { id: "mr-2", name: "MR-2 (Measles–Rubella)", dueAgeMonths: 16, windowEndMonths: 24, catchUp: true, catchUpUntilMonths: 60, price: 0, note: "16–24 months." },
  { id: "dpt-b1", name: "DPT Booster-1", dueAgeMonths: 16, windowEndMonths: 24, catchUp: true, catchUpUntilMonths: 36, price: 0, note: "16–24 months." },
  { id: "opv-b", name: "OPV Booster", dueAgeMonths: 16, windowEndMonths: 24, catchUp: true, catchUpUntilMonths: 36, price: 0, note: "16–24 months." },
  { id: "je-2", name: "Japanese Encephalitis (JE) — 2", dueAgeMonths: 16, windowEndMonths: 24, catchUp: true, catchUpUntilMonths: 36, endemicOnly: true, price: 0, note: "16–24 months. Only in JE-endemic districts." },
  { id: "dpt-b2", name: "DPT Booster-2", dueAgeMonths: 60, windowEndMonths: 72, catchUp: true, catchUpUntilMonths: 84, price: 0, note: "5–6 years." },
  { id: "td-10", name: "Td (Tetanus and Adult Diphtheria) — 10 Years", dueAgeMonths: 120, windowEndMonths: 132, catchUp: true, catchUpUntilMonths: 180, price: 0, note: "10 years. Replaces TT in UIP." },
  { id: "td-16", name: "Td — 16 Years", dueAgeMonths: 192, windowEndMonths: 204, catchUp: true, catchUpUntilMonths: 216, price: 0, note: "16 years." },
  { id: "hpv-uip", name: "HPV (Cervical Cancer) — UIP Introduction", dueAgeMonths: 108, windowEndMonths: 168, catchUp: true, catchUpUntilMonths: 180, girlsOnly: true, price: 0, note: "Girls 9–14 years. Being introduced under UIP as per MoHFW. Confirm current state rollout with the ANM / medical officer." },
];

/**
 * Older persons — vaccines advised by MoHFW / NCDC / NPHCE for high-risk and elderly groups.
 * Not a second UIP childhood schedule. Private extras (shingles, RSV) are not listed.
 */
export const SENIOR_VACCINES = [
  {
    id: "influenza-ncdc",
    name: "Seasonal Influenza (Annual)",
    minAgeYears: 65,
    recurring: "yearly",
    seasonMonth: 9,
    price: 899,
    note: "NCDC recommends annual influenza vaccine for adults 65 years and above and other high-risk groups before the influenza season (usually from October).",
  },
  {
    id: "pneumococcal-ncdc",
    name: "Pneumococcal Vaccine",
    minAgeYears: 65,
    once: true,
    price: 2499,
    note: "NCDC operational guidance for adults 65 years and above and high-risk groups (chronic heart, lung, kidney, diabetes, immunocompromised).",
  },
  {
    id: "covid-mohfw",
    name: "COVID-19 Additional Dose (as per Current MoHFW Advisory)",
    minAgeYears: 60,
    recurring: "yearly",
    price: 0,
    note: "Additional / precaution dose for 60 years and above and specified high-risk groups, as notified by MoHFW from time to time.",
  },
];

export const ALL_VACCINES = [...CHILD_VACCINES, ...SENIOR_VACCINES];

export const SLOTS = ["09:00–11:00", "11:00–13:00", "15:00–17:00", "17:00–19:00"];

export const UIP_DISCLAIMER =
  "Suggestions and due dates follow the Government of India Universal Immunisation Programme (National Immunization Schedule, Ministry of Health & Family Welfare / National Health Mission). Japanese Encephalitis is only for notified endemic districts. HPV is shown for eligible girls where UIP introduction is underway — confirm state rollout. Older-person suggestions follow MoHFW, NCDC and NPHCE guidance, not private schedules. A government ANM, medical officer or treating doctor must confirm doses, catch-up and contra-indications. This is not a prescription.";

export function vaccineById(id) {
  return ALL_VACCINES.find((row) => row.id === id) || null;
}

export function yearsToMonths(years, extraMonths = 0) {
  const y = Number(years);
  const m = Number(extraMonths);
  if (!Number.isFinite(y) || y < 0) return null;
  return Math.round(y * 12 + (Number.isFinite(m) ? m : 0));
}

export function ageGroupFromYears(years) {
  const y = Number(years);
  if (!Number.isFinite(y) || y < 0) return "";
  if (y < CHILD_MAX_YEARS) return "child";
  if (y >= SENIOR_MIN_YEARS) return "senior";
  return "adult";
}

export function parseIsoDate(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1) {
    return null;
  }
  return date;
}

export function toIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value) {
  const date = value instanceof Date ? value : parseIsoDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

export function addMonths(date, months) {
  const amount = Number(months || 0);
  const whole = Math.trunc(amount);
  const fraction = amount - whole;
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDate();
  next.setMonth(next.getMonth() + whole);
  if (next.getDate() < day) next.setDate(0);
  if (fraction) next.setDate(next.getDate() + Math.round(fraction * 30.44));
  return next;
}

export function addYears(date, years) {
  return addMonths(date, Number(years || 0) * 12);
}

export function ageMonthsFromDob(dob, today = new Date()) {
  const birth = parseIsoDate(dob);
  if (!birth) return null;
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function ageYearsFromDob(dob, today = new Date()) {
  const months = ageMonthsFromDob(dob, today);
  if (months == null) return null;
  return Math.floor(months / 12);
}

export function estimateDobFromAge(ageYears, extraMonths = 0, today = new Date()) {
  const months = yearsToMonths(ageYears, extraMonths);
  if (months == null) return "";
  return toIsoDate(addMonths(new Date(today.getFullYear(), today.getMonth(), today.getDate()), -months));
}

export function dueDateFromBirth(dob, vaccine) {
  const birth = parseIsoDate(dob);
  if (!birth || !vaccine) return "";
  if (vaccine.dueAgeWeeks != null) {
    return toIsoDate(addDays(birth, Math.round(Number(vaccine.dueAgeWeeks) * 7)));
  }
  if (vaccine.dueAgeMonths != null) {
    return toIsoDate(addMonths(birth, vaccine.dueAgeMonths));
  }
  if (vaccine.minAgeYears != null) {
    return toIsoDate(addYears(birth, vaccine.minAgeYears));
  }
  return "";
}

export function windowEndFromBirth(dob, vaccine) {
  const birth = parseIsoDate(dob);
  if (!birth || !vaccine || vaccine.windowEndMonths == null) return "";
  return toIsoDate(addMonths(birth, vaccine.windowEndMonths));
}

export function nextSeasonDate(today = new Date(), monthIndex = 9, day = 1) {
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let due = new Date(now.getFullYear(), monthIndex, day);
  if (due < now) due = new Date(now.getFullYear() + 1, monthIndex, day);
  return toIsoDate(due);
}

export function dueDateForSenior(vaccine, { dob, lastGivenOn, today = new Date() } = {}) {
  if (!vaccine) return "";
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (vaccine.recurring === "yearly") {
    if (lastGivenOn) {
      const last = parseIsoDate(lastGivenOn);
      if (last) return toIsoDate(addYears(last, 1));
    }
    if (vaccine.seasonMonth != null) return nextSeasonDate(now, vaccine.seasonMonth, 1);
    return toIsoDate(now);
  }
  if (lastGivenOn && vaccine.once) return "";
  if (dob) return dueDateFromBirth(dob, vaccine);
  return toIsoDate(now);
}

function upcomingHorizonMonths(vaccine) {
  const due = Number(vaccine.dueAgeMonths || 0);
  if (due <= 6) return 1.5;
  return 6;
}

function inWindow(ageMonths, vaccine) {
  const due = vaccine.dueAgeMonths;
  const end = vaccine.windowEndMonths ?? due + 1;
  const horizon = upcomingHorizonMonths(vaccine);
  if (ageMonths + horizon < due) return "";
  if (ageMonths < due - 0.15) return "upcoming";
  if (ageMonths <= end) return "due";
  if (vaccine.catchUp) {
    const catchUntil = vaccine.catchUpUntilMonths ?? end + 12;
    if (ageMonths <= catchUntil) return "catch-up";
  }
  return "";
}

function genderAllows(vaccine, gender) {
  if (!vaccine.girlsOnly) return true;
  const g = String(gender || "").toLowerCase();
  if (!g) return true;
  return g === "f" || g === "female";
}

export function suggestChildVaccines(ageMonths, { includeEndemic = false, gender = "" } = {}) {
  const months = Number(ageMonths);
  if (!Number.isFinite(months) || months < 0) return [];
  return CHILD_VACCINES.filter((vaccine) => {
    if (vaccine.endemicOnly && !includeEndemic) return false;
    if (!genderAllows(vaccine, gender)) return false;
    return Boolean(inWindow(months, vaccine));
  }).map((vaccine) => ({
    ...vaccine,
    status: inWindow(months, vaccine),
    dueLabel: formatDueAge(vaccine),
  }));
}

export function suggestSeniorVaccines(ageYears) {
  const years = Number(ageYears);
  if (!Number.isFinite(years) || years < SENIOR_MIN_YEARS) return [];
  return SENIOR_VACCINES.filter((vaccine) => years >= vaccine.minAgeYears).map((vaccine) => ({
    ...vaccine,
    status: "recommended",
    dueLabel: `${vaccine.minAgeYears}+ years`,
  }));
}

export function suggestVaccines({ group, ageYears, ageMonths, includeEndemic, gender }) {
  if (group === "child") {
    const months =
      ageMonths != null && ageMonths !== ""
        ? Number(ageMonths)
        : yearsToMonths(ageYears, 0);
    return suggestChildVaccines(months, { includeEndemic, gender });
  }
  if (group === "senior") return suggestSeniorVaccines(ageYears);
  return [];
}

export function formatDueAge(vaccineOrMonths) {
  if (vaccineOrMonths && typeof vaccineOrMonths === "object") {
    if (vaccineOrMonths.dueAgeWeeks === 0 || vaccineOrMonths.dueAgeMonths === 0) {
      return "At birth";
    }
    if (vaccineOrMonths.dueAgeWeeks != null && vaccineOrMonths.dueAgeWeeks < 16) {
      return `${vaccineOrMonths.dueAgeWeeks} weeks`;
    }
    return formatDueAge(vaccineOrMonths.dueAgeMonths);
  }
  const n = Number(vaccineOrMonths);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "At birth";
  if (n === 1.5) return "6 weeks";
  if (n === 2.5) return "10 weeks";
  if (n === 3.5) return "14 weeks";
  if (n < 12) return `${n} months`;
  if (n % 12 === 0) return `${n / 12} years`;
  return `${n} months`;
}

export function visitTotal(selected, visitFee = HOME_VISIT_FEE) {
  const list = Array.isArray(selected) ? selected : [];
  const vaccineSum = list.reduce((sum, item) => {
    if (item && typeof item === "object") return sum + Number(item.price || 0);
    const found = vaccineById(item);
    return sum + Number(found?.price || 0);
  }, 0);
  const fee = typeof visitFee === "number" ? visitFee : HOME_VISIT_FEE;
  return vaccineSum + fee;
}

export { inWindow as vaccineWindowStatus, genderAllows };
