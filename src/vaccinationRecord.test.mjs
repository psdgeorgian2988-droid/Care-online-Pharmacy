import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRemindersForPerson,
  dueSoonReminders,
  givenVaccinationRecords,
  loadVaccinationStore,
  recordVaccinationDose,
  resetVaccinationStore,
  upsertVaccinationPerson,
} from "./vaccinationRecord.js";

test("saving a child record stores due dates for remaining UIP doses", () => {
  resetVaccinationStore();
  const { person, store } = upsertVaccinationPerson(
    {
      name: "Aarav",
      gender: "M",
      dob: "2026-01-01",
      keepRecord: true,
      remindersOn: true,
    },
    new Date(2026, 0, 20)
  );
  assert.equal(person.keepRecord, true);
  const mr1 = store.reminders.find((row) => row.vaccineId === "mr-1");
  assert.equal(mr1.dueOn, "2026-10-01");
  assert.equal(mr1.dueOnLabel.includes("2026"), true);
  const pcv2 = store.reminders.find((row) => row.vaccineId === "pcv-2");
  assert.equal(pcv2.dueOn, "2026-04-09");
  assert.equal(store.reminders.some((row) => row.vaccineId === "je-1"), false);
});

test("required child or adult vaccines limit saved due dates to the selected doses", () => {
  resetVaccinationStore();
  const { store } = upsertVaccinationPerson(
    {
      name: "Anita",
      gender: "F",
      dob: "1960-01-01",
      keepRecord: true,
      remindersOn: true,
      requiredIds: ["influenza-ncdc", "td-16"],
    },
    new Date(2026, 0, 20)
  );
  const ids = store.reminders.map((row) => row.vaccineId).sort();
  assert.deepEqual(ids, ["influenza-ncdc", "td-16"]);
});

test("given doses drop off the saved reminder list and the next due date stays saved", () => {
  resetVaccinationStore();
  const { person } = upsertVaccinationPerson(
    {
      name: "Aarav",
      gender: "M",
      dob: "2026-01-01",
      keepRecord: true,
      remindersOn: true,
    },
    new Date(2026, 0, 1)
  );
  recordVaccinationDose({
    personId: person.id,
    vaccineId: "bcg",
    givenOn: "2026-01-01",
    status: "given",
  });
  const reminders = buildRemindersForPerson(
    person,
    loadVaccinationStore(),
    new Date(2026, 0, 20)
  );
  assert.equal(reminders.some((row) => row.vaccineId === "bcg"), false);
  const sixWeek = reminders.find((row) => row.vaccineId === "penta-1");
  assert.equal(sixWeek.dueOn, "2026-02-12");
});

test("given vaccination records list the vaccine and date by patient name", () => {
  resetVaccinationStore();
  const child = upsertVaccinationPerson({
    name: "Aarav Sharma",
    gender: "M",
    dob: "2024-01-01",
    keepRecord: true,
  }).person;
  const adult = upsertVaccinationPerson({
    name: "Priya Sharma",
    gender: "F",
    dob: "1990-01-01",
    keepRecord: true,
  }).person;
  recordVaccinationDose({
    personId: child.id,
    vaccineId: "bcg",
    givenOn: "2024-01-02",
    status: "given",
  });
  recordVaccinationDose({
    personId: adult.id,
    vaccineId: "influenza-ncdc",
    givenOn: "2026-09-01",
    status: "given",
  });
  recordVaccinationDose({
    personId: adult.id,
    vaccineId: "td-16",
    givenOn: "2026-03-01",
    status: "scheduled",
  });
  const all = givenVaccinationRecords(loadVaccinationStore());
  assert.deepEqual(
    all.map((row) => `${row.personName}:${row.vaccineName}:${row.givenOn}`),
    [
      "Priya Sharma:Seasonal Influenza (Annual):2026-09-01",
      "Aarav Sharma:BCG:2024-01-02",
    ]
  );
  const forChild = givenVaccinationRecords(loadVaccinationStore(), {
    name: "Aarav Sharma",
  });
  assert.equal(forChild.length, 1);
  assert.equal(forChild[0].vaccineName, "BCG");
  assert.ok(forChild[0].givenOnLabel);
});

test("given vaccination records keep patient name and optional uploaded file", () => {
  resetVaccinationStore();
  const child = upsertVaccinationPerson({
    id: "self",
    name: "Asha",
    gender: "F",
    dob: "1990-01-01",
    keepRecord: true,
  }).person;
  const saved = recordVaccinationDose({
    personId: child.id,
    personName: "Asha",
    mobile: "9876543210",
    vaccineId: "influenza-ncdc",
    givenOn: "2026-09-01",
    status: "given",
    source: "partner",
    fileName: "flu.pdf",
    fileType: "application/pdf",
    fileData: "data:application/pdf;base64,aaa",
  });
  assert.equal(saved.ok, true);
  const rows = givenVaccinationRecords(loadVaccinationStore(), { id: "self", name: "Asha" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].personName, "Asha");
  assert.equal(rows[0].fileName, "flu.pdf");
  assert.equal(rows[0].fileData, "data:application/pdf;base64,aaa");
  assert.equal(rows[0].source, "partner");
});

test("due-soon reminders include overdue and dates within the next weeks", () => {
  resetVaccinationStore();
  upsertVaccinationPerson(
    {
      name: "Meera",
      gender: "F",
      dob: "2025-11-01",
      keepRecord: true,
      remindersOn: true,
    },
    new Date(2026, 0, 20)
  );
  const soon = dueSoonReminders(loadVaccinationStore(), 21, new Date(2026, 0, 20));
  assert.equal(soon.length > 0, true);
  assert.equal(soon.every((row) => Boolean(row.dueOn)), true);
});

test("given vaccination records stay in Medical Record, not a vaccination page tab", () => {
  const tree = readFileSync(new URL("./homeServiceTree.js", import.meta.url), "utf8");
  assert.match(tree, /rep-vax[\s\S]*#reports\?service=vaccination/);
  assert.doesNotMatch(tree, /vax-record/);
  const page = readFileSync(new URL("./Vaccination.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /<h1>Vaccination Record<\/h1>/);
  assert.match(page, /<h1>Vaccination<\/h1>/);
});
