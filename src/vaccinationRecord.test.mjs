import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRemindersForPerson,
  dueSoonReminders,
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
