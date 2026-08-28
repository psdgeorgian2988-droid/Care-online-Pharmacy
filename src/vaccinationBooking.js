import {
  CHILD_VACCINES,
  SENIOR_VACCINES,
  ageMonthsFromDob,
  ageYearsFromDob,
  estimateDobFromAge,
  suggestChildVaccines,
  vaccineById,
  visitTotal,
} from "./vaccinationSchedule.js";

export const BOOKING_STORAGE_KEY = "mediHomeVaccinationBooking";
export const BOOKING_EVENT = "medihome-vaccination-booking";
export const HOMECARE_DRAFT_KEY = "mediHomeHomeCareDraft";

export const ADULT_VACCINATION_PLAN = "vaccination";
export const CHILD_VACCINATION_PLAN = "vaccination-child";
export const SUGGEST_CHILD_BEFORE_YEARS = 19;
export const SUGGEST_ADULT_FROM_YEARS = 60;

let memoryStore = null;
const memoryMap = new Map();

function storage() {
  if (typeof sessionStorage !== "undefined") return sessionStorage;
  if (!memoryStore) {
    memoryStore = {
      getItem(key) {
        return memoryMap.has(key) ? memoryMap.get(key) : null;
      },
      setItem(key, value) {
        memoryMap.set(key, value);
      },
      removeItem(key) {
        memoryMap.delete(key);
      },
    };
  }
  return memoryStore;
}

export function emptyVaccinationBooking() {
  return {
    group: "child",
    vaccineIds: [],
    bookedFor: "",
    name: "",
    gender: "",
    dob: "",
    fromNurse: false,
    picked: false,
  };
}

export function isVaccinationPlan(plan) {
  return plan === ADULT_VACCINATION_PLAN || plan === CHILD_VACCINATION_PLAN;
}

export function vaccineGroupForId(id) {
  const value = String(id || "").trim();
  if (CHILD_VACCINES.some((row) => row.id === value)) return "child";
  if (SENIOR_VACCINES.some((row) => row.id === value)) return "adult";
  return "";
}

export function vaccinesForGroup(group) {
  return group === "adult" ? SENIOR_VACCINES : CHILD_VACCINES;
}

export function carePlanForGroup(group) {
  return group === "adult" ? ADULT_VACCINATION_PLAN : CHILD_VACCINATION_PLAN;
}

export function groupForCarePlan(plan) {
  return plan === ADULT_VACCINATION_PLAN ? "adult" : "child";
}

export function nurseBookingHref(planOrGroup) {
  const plan = isVaccinationPlan(planOrGroup)
    ? planOrGroup
    : carePlanForGroup(planOrGroup);
  return `#homecare?service=nurse&plan=${plan}`;
}

export function suggestionGroupFromYears(years) {
  const y = Number(years);
  if (!Number.isFinite(y) || y < 0) return "";
  if (y < SUGGEST_CHILD_BEFORE_YEARS) return "child";
  if (y >= SUGGEST_ADULT_FROM_YEARS) return "adult";
  return "";
}

export function suggestedVaccinesForPerson({
  dob,
  gender = "",
  today = new Date(),
} = {}) {
  const years = ageYearsFromDob(dob, today);
  const group = suggestionGroupFromYears(years);
  if (group === "child") {
    const months = ageMonthsFromDob(dob, today);
    return suggestChildVaccines(months, { gender }).filter(
      (row) => row.status === "due" || row.status === "catch-up" || row.status === "upcoming"
    );
  }
  if (group === "adult") {
    return SENIOR_VACCINES.filter(
      (row) => Number(years) >= Number(row.minAgeYears || 0)
    ).map((row) => ({
      ...row,
      status: "recommended",
      dueLabel: `${row.minAgeYears}+ years`,
    }));
  }
  return [];
}

export function normalizeVaccinationBooking(source = {}) {
  const hintedGroup =
    source.group === "adult" || source.group === "child" ? source.group : "";
  const rawIds = Array.isArray(source.vaccineIds)
    ? source.vaccineIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const firstGroup = vaccineGroupForId(rawIds[0]);
  const group = hintedGroup || firstGroup || "child";
  const allowed = new Set(vaccinesForGroup(group).map((row) => row.id));
  const vaccineIds = [...new Set(rawIds.filter((id) => allowed.has(id)))];
  return {
    group,
    vaccineIds,
    bookedFor: String(source.bookedFor || ""),
    name: String(source.name || "").trim(),
    gender: String(source.gender || "").trim(),
    dob: String(source.dob || "").trim(),
    fromNurse: Boolean(source.fromNurse),
    picked: Boolean(source.picked),
  };
}

function persist(booking) {
  const next = normalizeVaccinationBooking(booking);
  storage().setItem(BOOKING_STORAGE_KEY, JSON.stringify(next));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BOOKING_EVENT, { detail: next }));
  }
  return next;
}

export function loadVaccinationBooking() {
  try {
    const parsed = JSON.parse(storage().getItem(BOOKING_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return emptyVaccinationBooking();
    return normalizeVaccinationBooking(parsed);
  } catch {
    return emptyVaccinationBooking();
  }
}

export function saveVaccinationBooking(source) {
  return persist({ ...loadVaccinationBooking(), ...source });
}

export function resetVaccinationBooking() {
  memoryMap.delete(BOOKING_STORAGE_KEY);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(BOOKING_STORAGE_KEY);
  }
  return persist(emptyVaccinationBooking());
}

export function setBookingGroup(group) {
  const nextGroup = group === "adult" ? "adult" : "child";
  const current = loadVaccinationBooking();
  const allowed = new Set(vaccinesForGroup(nextGroup).map((row) => row.id));
  return persist({
    ...current,
    group: nextGroup,
    vaccineIds: current.vaccineIds.filter((id) => allowed.has(id)),
  });
}

export function syncBookingToPlan(plan) {
  if (!isVaccinationPlan(plan)) return loadVaccinationBooking();
  return setBookingGroup(groupForCarePlan(plan));
}

export function toggleBookingVaccine(id) {
  const value = String(id || "").trim();
  const group = vaccineGroupForId(value);
  if (!group) return loadVaccinationBooking();
  const current = loadVaccinationBooking();
  if (current.group !== group) {
    return persist({ ...current, group, vaccineIds: [value] });
  }
  const has = current.vaccineIds.includes(value);
  return persist({
    ...current,
    group,
    vaccineIds: has
      ? current.vaccineIds.filter((row) => row !== value)
      : [...current.vaccineIds, value],
  });
}

export function applyPersonToBooking(person = {}, today = new Date()) {
  const current = loadVaccinationBooking();
  const dob =
    String(person.dob || "").trim() ||
    (person.age ? estimateDobFromAge(person.age, 0, today) : "");
  const gender = person.gender || "";
  const suggested = suggestedVaccinesForPerson({
    dob,
    gender,
    today,
  });
  const years = ageYearsFromDob(dob, today);
  const group = suggestionGroupFromYears(years) || current.group || "child";
  return persist({
    ...current,
    bookedFor: person.bookedFor ?? current.bookedFor,
    name: person.name != null ? String(person.name).trim() : current.name,
    gender: gender || current.gender,
    dob,
    group,
    vaccineIds: suggested.map((row) => row.id),
    fromNurse: person.fromNurse ?? current.fromNurse,
    picked: current.picked,
  });
}

export function markVaccinesPicked() {
  return persist({ ...loadVaccinationBooking(), picked: true, fromNurse: true });
}

export function selectedBookingVaccines(booking = loadVaccinationBooking()) {
  const next = normalizeVaccinationBooking(booking);
  return next.vaccineIds.map((id) => vaccineById(id)).filter(Boolean);
}

export function vaccinationVisitTotal(booking = loadVaccinationBooking()) {
  return visitTotal(selectedBookingVaccines(booking));
}

export function vaccinationOrderItems(booking, planLabel, total) {
  const vaccines = selectedBookingVaccines(booking);
  const items = [
    {
      name: `Nurse Visit · ${planLabel}`,
      price: total,
    },
  ];
  for (const vaccine of vaccines) {
    items.push({
      name: vaccine.name,
      price: Number(vaccine.price || 0),
    });
  }
  return items;
}

export function saveHomeCareDraft(form) {
  try {
    storage().setItem(HOMECARE_DRAFT_KEY, JSON.stringify(form || {}));
  } catch {
    /* ignore */
  }
}

export function loadHomeCareDraft() {
  try {
    const parsed = JSON.parse(storage().getItem(HOMECARE_DRAFT_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearHomeCareDraft() {
  try {
    storage().removeItem(HOMECARE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
