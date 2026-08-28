import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_VACCINES,
  CHILD_VACCINES,
  HOME_VISIT_FEE,
  SENIOR_VACCINES,
  ageGroupFromYears,
  dueDateFromBirth,
  fullVaccinationSchedule,
  suggestChildVaccines,
  suggestSeniorVaccines,
  visitTotal,
  yearsToMonths,
} from "./vaccinationSchedule.js";

const PRIVATE_NOT_UIP = [
  "varicella",
  "hepa",
  "hep-a",
  "mmr",
  "typhoid",
  "zoster",
  "shingles",
  "rsv",
  "flu",
  "tdap",
];

test("a newborn is due BCG, hepatitis B birth dose and OPV-0", () => {
  const due = suggestChildVaccines(0)
    .filter((row) => row.status === "due")
    .map((row) => row.id);
  assert.equal(due.includes("bcg"), true);
  assert.equal(due.includes("hepb-bd"), true);
  assert.equal(due.includes("opv-0"), true);
});

test("UIP at 10 weeks does not include PCV as due; PCV-2 is due at 14 weeks", () => {
  const due = suggestChildVaccines(2.5)
    .filter((row) => row.status === "due")
    .map((row) => row.id);
  assert.equal(due.includes("penta-2"), true);
  assert.equal(due.includes("opv-2"), true);
  assert.equal(due.includes("rvv-2"), true);
  assert.equal(due.includes("pcv-2"), false);
  const fourteenDue = suggestChildVaccines(3.5)
    .filter((row) => row.status === "due")
    .map((row) => row.id);
  assert.equal(fourteenDue.includes("pcv-2"), true);
  assert.equal(fourteenDue.includes("fipv-2"), true);
});

test("a 9-month-old is due measles-rubella (MR), not MMR", () => {
  const due = suggestChildVaccines(9)
    .filter((row) => row.status === "due")
    .map((row) => row.id);
  assert.equal(due.includes("mr-1"), true);
  assert.equal(due.includes("pcv-b"), true);
  assert.equal(due.includes("mmr"), false);
});

test("JE is suggested only for notified endemic districts", () => {
  const without = suggestChildVaccines(9).map((row) => row.id);
  const withJe = suggestChildVaccines(9, { includeEndemic: true }).map((row) => row.id);
  assert.equal(without.includes("je-1"), false);
  assert.equal(withJe.includes("je-1"), true);
});

test("child suggestions stay on the Government of India UIP list", () => {
  const ids = CHILD_VACCINES.map((row) => row.id);
  for (const banned of PRIVATE_NOT_UIP) {
    assert.equal(ids.includes(banned), false);
  }
  const nineMonthNames = suggestChildVaccines(9).map((row) => row.name.toLowerCase());
  assert.equal(nineMonthNames.some((name) => name.includes("varicella")), false);
  assert.equal(nineMonthNames.some((name) => name.includes("hepatitis a")), false);
});

test("a 65-year-old is recommended influenza and pneumococcal under NCDC/MoHFW, not shingles or RSV", () => {
  const ids = suggestSeniorVaccines(65).map((row) => row.id);
  assert.equal(ids.includes("influenza-ncdc"), true);
  assert.equal(ids.includes("pneumococcal-ncdc"), true);
  assert.equal(ids.includes("covid-mohfw"), true);
  assert.equal(SENIOR_VACCINES.some((row) => /zoster|shingles|rsv/i.test(row.id)), false);
});

test("age grouping sends children and older adults to the right schedule", () => {
  assert.equal(ageGroupFromYears(2), "child");
  assert.equal(ageGroupFromYears(17), "child");
  assert.equal(ageGroupFromYears(40), "adult");
  assert.equal(ageGroupFromYears(72), "senior");
  assert.equal(yearsToMonths(1, 6), 18);
});

test("UIP due dates are calculated from date of birth", () => {
  assert.equal(dueDateFromBirth("2026-01-01", CHILD_VACCINES.find((row) => row.id === "bcg")), "2026-01-01");
  assert.equal(dueDateFromBirth("2026-01-01", CHILD_VACCINES.find((row) => row.id === "penta-1")), "2026-02-12");
  assert.equal(dueDateFromBirth("2026-01-01", CHILD_VACCINES.find((row) => row.id === "penta-2")), "2026-03-12");
  assert.equal(dueDateFromBirth("2026-01-01", CHILD_VACCINES.find((row) => row.id === "pcv-2")), "2026-04-09");
  assert.equal(dueDateFromBirth("2026-01-01", CHILD_VACCINES.find((row) => row.id === "mr-1")), "2026-10-01");
});

test("full schedule lists newborn through older-person vaccines, grouped by age", () => {
  const guide = fullVaccinationSchedule();
  assert.equal(guide.children[0].when, "At birth");
  assert.equal(
    guide.children[0].vaccines.some((row) => row.id === "bcg"),
    true
  );
  const names = guide.children.flatMap((row) => row.vaccines.map((item) => item.id));
  assert.equal(names.includes("td-16"), true);
  assert.equal(guide.adults.some((row) => row.when.includes("65")), true);
  assert.equal(
    guide.adults.some((row) =>
      row.vaccines.some((item) => item.id === "influenza-ncdc")
    ),
    true
  );
});

test("home visit fee is added to selected vaccine prices", () => {
  assert.equal(visitTotal([], HOME_VISIT_FEE), HOME_VISIT_FEE);
  assert.equal(visitTotal(["bcg"]), HOME_VISIT_FEE);
  assert.equal(visitTotal([{ price: 899 }]), HOME_VISIT_FEE + 899);
  assert.equal(ALL_VACCINES.length > 20, true);
});
