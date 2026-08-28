import assert from "node:assert/strict";
import { test } from "node:test";
import { HOME_VISIT_FEE } from "./vaccinationSchedule.js";
import {
  ADULT_VACCINATION_PLAN,
  CHILD_VACCINATION_PLAN,
  applyPersonToBooking,
  isVaccinationPlan,
  loadVaccinationBooking,
  nurseBookingHref,
  normalizeVaccinationBooking,
  resetVaccinationBooking,
  selectedBookingVaccines,
  setBookingGroup,
  suggestedVaccinesForPerson,
  suggestionGroupFromYears,
  syncBookingToPlan,
  toggleBookingVaccine,
  vaccinationVisitTotal,
} from "./vaccinationBooking.js";

const today = new Date(2026, 7, 28);

test("children vaccination is the default booking group", () => {
  resetVaccinationBooking();
  const stored = loadVaccinationBooking();
  assert.equal(stored.group, "child");
  assert.deepEqual(stored.vaccineIds, []);
  assert.equal(isVaccinationPlan(CHILD_VACCINATION_PLAN), true);
  assert.equal(nurseBookingHref("child"), "#homecare?service=nurse&plan=vaccination-child");
  assert.equal(
    nurseBookingHref(ADULT_VACCINATION_PLAN),
    "#homecare?service=nurse&plan=vaccination"
  );
});

test("age under 19 suggests child vaccines from date of birth", () => {
  assert.equal(suggestionGroupFromYears(0), "child");
  assert.equal(suggestionGroupFromYears(18), "child");
  assert.equal(suggestionGroupFromYears(19), "");
  const ids = suggestedVaccinesForPerson({
    dob: "2026-08-20",
    gender: "M",
    today,
  }).map((row) => row.id);
  assert.equal(ids.includes("bcg"), true);
  assert.equal(ids.includes("hepb-bd"), true);
  assert.equal(ids.includes("opv-0"), true);
});

test("age 60 and above suggests adult vaccines from date of birth", () => {
  assert.equal(suggestionGroupFromYears(60), "adult");
  assert.equal(suggestionGroupFromYears(65), "adult");
  const ids = suggestedVaccinesForPerson({
    dob: "1960-01-01",
    gender: "F",
    today,
  }).map((row) => row.id);
  assert.equal(ids.includes("covid-mohfw"), true);
  assert.equal(ids.includes("influenza-ncdc"), true);
});

test("selecting a saved family member applies that person's date of birth", () => {
  resetVaccinationBooking();
  const next = applyPersonToBooking(
    {
      bookedFor: "fam-1",
      name: "Aarav Sharma",
      gender: "M",
      dob: "2025-11-28",
    },
    today
  );
  assert.equal(next.name, "Aarav Sharma");
  assert.equal(next.dob, "2025-11-28");
  assert.equal(next.group, "child");
  assert.equal(next.vaccineIds.length > 0, true);
});

test("a saved family member with age and no date of birth still gets child suggestions", () => {
  resetVaccinationBooking();
  const next = applyPersonToBooking(
    {
      bookedFor: "fam-1",
      name: "Aarav Sharma",
      gender: "M",
      age: "1",
    },
    today
  );
  assert.equal(next.group, "child");
  assert.equal(next.dob.length > 0, true);
  assert.equal(next.vaccineIds.length > 0, true);
});

test("selected child vaccines stay stored when returning to nurse booking", () => {
  resetVaccinationBooking();
  toggleBookingVaccine("bcg");
  toggleBookingVaccine("penta-1");
  const stored = loadVaccinationBooking();
  assert.equal(stored.group, "child");
  assert.deepEqual(stored.vaccineIds, ["bcg", "penta-1"]);
  assert.deepEqual(
    selectedBookingVaccines(stored).map((row) => row.name),
    ["BCG", "Pentavalent-1 (DPT + Hep B + Hib)"]
  );
  assert.equal(vaccinationVisitTotal(stored), HOME_VISIT_FEE);
});

test("picking an adult vaccine switches the booking to adult vaccination", () => {
  resetVaccinationBooking();
  toggleBookingVaccine("bcg");
  toggleBookingVaccine("influenza-ncdc");
  const stored = loadVaccinationBooking();
  assert.equal(stored.group, "adult");
  assert.deepEqual(stored.vaccineIds, ["influenza-ncdc"]);
});

test("switching to children vaccination keeps only child doses", () => {
  resetVaccinationBooking();
  toggleBookingVaccine("influenza-ncdc");
  const next = setBookingGroup("child");
  assert.equal(next.group, "child");
  assert.deepEqual(next.vaccineIds, []);
  syncBookingToPlan(CHILD_VACCINATION_PLAN);
  assert.equal(loadVaccinationBooking().group, "child");
});

test("adult vaccine ids are dropped from a child booking", () => {
  const next = normalizeVaccinationBooking({
    group: "child",
    vaccineIds: ["bcg", "influenza-ncdc", ""],
    name: "Aarav",
  });
  assert.equal(next.group, "child");
  assert.deepEqual(next.vaccineIds, ["bcg"]);
  assert.equal(next.name, "Aarav");
});
