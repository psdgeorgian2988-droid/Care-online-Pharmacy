import { pickFamilyMembers } from "./personFields.js";
import {
  ALL_VACCINES,
  CHILD_VACCINES,
  SENIOR_VACCINES,
  ageGroupFromYears,
  ageYearsFromDob,
  dueDateForSenior,
  dueDateFromBirth,
  estimateDobFromAge,
  formatDueAge,
  formatDisplayDate,
  parseIsoDate,
  toIsoDate,
  vaccineById,
  windowEndFromBirth,
} from "./vaccinationSchedule.js";

export const RECORD_STORAGE_KEY = "mediHomeVaccinationRecords";
export const RECORD_EVENT = "medihome-vaccination-record";

let memoryStore = null;

function storage() {
  if (typeof localStorage !== "undefined") return localStorage;
  if (!memoryStore) memoryStore = { value: null };
  return {
    getItem() {
      return memoryStore.value;
    },
    setItem(_key, value) {
      memoryStore.value = value;
    },
  };
}

function emptyStore() {
  return { people: [], doses: [], reminders: [] };
}

export function loadVaccinationStore() {
  try {
    const parsed = JSON.parse(storage().getItem(RECORD_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return emptyStore();
    return {
      people: Array.isArray(parsed.people) ? parsed.people : [],
      doses: Array.isArray(parsed.doses) ? parsed.doses : [],
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
    };
  } catch {
    return emptyStore();
  }
}

function persist(store) {
  storage().setItem(RECORD_STORAGE_KEY, JSON.stringify(store));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(RECORD_EVENT, { detail: store }));
  }
  return store;
}

export function resetVaccinationStore() {
  memoryStore = { value: null };
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(RECORD_STORAGE_KEY);
  }
  return persist(emptyStore());
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function eligibleVaccine(vaccine, person) {
  if (vaccine.girlsOnly) {
    const g = String(person.gender || "").toLowerCase();
    if (g && g !== "f" && g !== "female") return false;
  }
  return true;
}

export function personGroup(person) {
  const years =
    person.ageYears != null && person.ageYears !== ""
      ? Number(person.ageYears)
      : ageYearsFromDob(person.dob);
  return ageGroupFromYears(years) || person.group || "";
}

export function normalizePerson(source = {}) {
  const keepRecord = Boolean(source.keepRecord);
  const remindersOn = Boolean(source.remindersOn);
  const ageYears =
    source.ageYears != null && source.ageYears !== ""
      ? String(source.ageYears).replace(/\D/g, "").slice(0, 3)
      : "";
  let dob = String(source.dob || "").trim();
  let dobEstimated = Boolean(source.dobEstimated);
  if (!parseIsoDate(dob) && ageYears) {
    dob = estimateDobFromAge(ageYears, source.ageMonths || 0);
    dobEstimated = true;
  }
  const years = ageYears || ageYearsFromDob(dob) || "";
  return {
    id: String(source.id || newId("vacp")),
    name: String(source.name || "").trim(),
    relation: String(source.relation || "self").trim() || "self",
    gender: String(source.gender || "").trim(),
    dob,
    dobEstimated,
    ageYears: years === "" || years == null ? "" : String(years),
    group: ageGroupFromYears(years) || source.group || "",
    keepRecord: keepRecord || remindersOn,
    remindersOn,
    requiredIds: Array.isArray(source.requiredIds)
      ? source.requiredIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [],
  };
}

export function dosesForPerson(store, personId) {
  return (store.doses || []).filter((row) => row.personId === personId);
}

export function lastGivenOn(store, personId, vaccineId) {
  const rows = dosesForPerson(store, personId)
    .filter((row) => row.vaccineId === vaccineId && row.status === "given" && row.givenOn)
    .sort((a, b) => String(b.givenOn).localeCompare(String(a.givenOn)));
  return rows[0]?.givenOn || "";
}

function doseCovers(store, personId, vaccineId) {
  return dosesForPerson(store, personId).some(
    (row) =>
      row.vaccineId === vaccineId &&
      (row.status === "given" || row.status === "scheduled")
  );
}

export function reminderStatus(dueOn, windowEndOn, todayIso) {
  if (!dueOn) return "";
  if (todayIso < dueOn) return "upcoming";
  if (!windowEndOn || todayIso <= windowEndOn) return "due";
  return "overdue";
}

export function buildRemindersForPerson(person, store, today = new Date()) {
  if (!person?.remindersOn || !person.dob) return [];
  const todayIso = toIsoDate(today);
  const group = personGroup(person);
  const wanted = Array.isArray(person.requiredIds)
    ? person.requiredIds.map(String).filter(Boolean)
    : [];
  const list = wanted.length
    ? ALL_VACCINES.filter((vaccine) => wanted.includes(vaccine.id))
    : group === "senior"
      ? SENIOR_VACCINES
      : CHILD_VACCINES;
  const years = Number(person.ageYears || ageYearsFromDob(person.dob, today) || 0);
  return list
    .filter((vaccine) => eligibleVaccine(vaccine, person))
    .filter((vaccine) => {
      if (wanted.length) return true;
      if (group === "senior") return years >= Number(vaccine.minAgeYears || 0);
      return true;
    })
    .map((vaccine) => {
      if (doseCovers(store, person.id, vaccine.id) && !vaccine.recurring) {
        return null;
      }
      const last = lastGivenOn(store, person.id, vaccine.id);
      const isAdult = vaccine.minAgeYears != null;
      const dueOn = isAdult
        ? dueDateForSenior(vaccine, { dob: person.dob, lastGivenOn: last, today })
        : dueDateFromBirth(person.dob, vaccine);
      if (!dueOn) return null;
      if (vaccine.recurring && last && dueOn && last >= dueOn) return null;
      const windowEndOn = isAdult
        ? vaccine.recurring === "yearly"
          ? dueOn
          : ""
        : windowEndFromBirth(person.dob, vaccine);
      const status = reminderStatus(dueOn, windowEndOn, todayIso);
      return {
        id: `${person.id}:${vaccine.id}:${dueOn}`,
        personId: person.id,
        personName: person.name,
        vaccineId: vaccine.id,
        vaccineName: vaccine.name,
        dueOn,
        dueOnLabel: formatDisplayDate(dueOn),
        windowEndOn: windowEndOn || "",
        windowEndLabel: formatDisplayDate(windowEndOn),
        dueLabel: formatDueAge(vaccine),
        status,
        dobEstimated: Boolean(person.dobEstimated),
        savedAt: todayIso,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.dueOn).localeCompare(String(b.dueOn)));
}

function rebuildReminders(store, today = new Date()) {
  const next = [];
  for (const person of store.people) {
    next.push(...buildRemindersForPerson(person, store, today));
  }
  store.reminders = next;
  return store;
}

export function upsertVaccinationPerson(input, today = new Date()) {
  const store = loadVaccinationStore();
  const person = normalizePerson(input);
  if (!person.name) {
    return { ok: false, error: "name", store, person };
  }
  if (!person.keepRecord && !person.remindersOn) {
    store.people = store.people.filter((row) => row.id !== person.id);
    store.doses = store.doses.filter((row) => row.personId !== person.id);
    rebuildReminders(store, today);
    persist(store);
    return { ok: true, saved: false, store, person };
  }
  const index = store.people.findIndex((row) => row.id === person.id);
  if (index >= 0) store.people[index] = { ...store.people[index], ...person };
  else store.people.push(person);
  rebuildReminders(store, today);
  persist(store);
  return { ok: true, saved: true, store, person };
}

export function removeVaccinationPerson(personId) {
  const store = loadVaccinationStore();
  store.people = store.people.filter((row) => row.id !== personId);
  store.doses = store.doses.filter((row) => row.personId !== personId);
  rebuildReminders(store);
  persist(store);
  return store;
}

export function recordVaccinationDose({
  personId,
  vaccineId,
  givenOn,
  status = "given",
  bookingId = "",
  source = "manual",
} = {}) {
  const store = loadVaccinationStore();
  const vaccine = vaccineById(vaccineId);
  if (!personId || !vaccine) return { ok: false, store };
  const dose = {
    id: newId("vacd"),
    personId,
    vaccineId,
    vaccineName: vaccine.name,
    givenOn: String(givenOn || toIsoDate(new Date())),
    status,
    bookingId: bookingId || "",
    source,
  };
  const existing = store.doses.findIndex(
    (row) =>
      row.personId === personId &&
      row.vaccineId === vaccineId &&
      (status === "scheduled"
        ? row.status === "scheduled"
        : row.status === "given" && row.givenOn === dose.givenOn)
  );
  if (existing >= 0) store.doses[existing] = { ...store.doses[existing], ...dose };
  else store.doses.unshift(dose);
  rebuildReminders(store, parseIsoDate(dose.givenOn) || new Date());
  persist(store);
  return { ok: true, dose, store };
}

export function recordBookingDoses({ person, vaccineIds, visitDate, bookingId }) {
  if (!person?.keepRecord && !person?.remindersOn) {
    return loadVaccinationStore();
  }
  const saved = upsertVaccinationPerson(person);
  for (const vaccineId of vaccineIds || []) {
    recordVaccinationDose({
      personId: saved.person.id,
      vaccineId,
      givenOn: visitDate,
      status: "scheduled",
      bookingId,
      source: "booking",
    });
  }
  return loadVaccinationStore();
}

export function savedReminders(store = loadVaccinationStore()) {
  return [...(store.reminders || [])].sort((a, b) =>
    String(a.dueOn).localeCompare(String(b.dueOn))
  );
}

export function dueSoonReminders(store = loadVaccinationStore(), withinDays = 21, today = new Date()) {
  const start = toIsoDate(today);
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + withinDays);
  const end = toIsoDate(endDate);
  return savedReminders(store).filter((row) => {
    if (row.status === "due" || row.status === "overdue") return true;
    return row.dueOn >= start && row.dueOn <= end;
  });
}

export function peopleFromProfile(profile = {}) {
  const self = {
    id: "self",
    name: String(profile.name || "").trim() || "Myself",
    relation: "self",
    gender: profile.gender || "",
    ageYears: profile.age || "",
    keepRecord: false,
    remindersOn: false,
  };
  const members = pickFamilyMembers(profile).map((row) => ({
    id: row.id,
    name: row.name,
    relation: row.relation,
    gender: row.gender,
    ageYears: row.age,
    keepRecord: false,
    remindersOn: false,
  }));
  return [self, ...members];
}

export { ALL_VACCINES };
