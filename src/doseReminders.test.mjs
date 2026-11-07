import assert from "node:assert/strict";
import { test } from "node:test";
import {
  diabetesBpDoseMedicines,
  doseMedicineFrom,
  dueDoseAlarms,
  emptyDoseSchedule,
  markDoseFired,
  missedDoses,
  recordDoseAnswer,
  setAllDoseAlarms,
  setDoseAlarm,
  setDoseMedicines,
  toggleDoseMedicine,
} from "./doseReminders.js";

test("the dose list offers the prescription medicines, including Pantocid", () => {
  const meds = diabetesBpDoseMedicines();
  assert.equal(meds.length, 8);
  assert.equal(meds.at(-1).brand, "Pantocid");
  assert.equal(meds.at(-1).salt, "Pantoprazole");
  assert.equal(meds.at(-1).image, "/meds/pack-violet.svg");
  assert.deepEqual(
    meds.map((med) => med.salt),
    [
      "Metformin",
      "Glimepiride",
      "Metformin + Glimepiride",
      "Telmisartan",
      "Amlodipine",
      "Telmisartan + Hydrochlorothiazide",
      "Losartan",
      "Pantoprazole",
    ]
  );
});

test("saving a time replaces that dose with the selected medicines", () => {
  const meds = diabetesBpDoseMedicines().slice(0, 2);
  const schedule = setDoseMedicines(emptyDoseSchedule(), "post-jentaculum", meds);
  assert.equal(schedule.slots["post-jentaculum"].medicines.length, 2);
  assert.equal(schedule.slots["post-jentaculum"].medicines[1].salt, "Glimepiride");
  assert.equal(schedule.slots["ante-jentaculum"].medicines.length, 0);
});

test("a ticked medicine keeps its name and salt on that dose", () => {
  const med = doseMedicineFrom(
    { id: "med-1", name: "Dolo 650", salt: "Paracetamol" },
    0,
    { brand: "Dolo", salt: "Paracetamol", category: "Pain Relief" }
  );
  assert.equal(med.brand, "Dolo");
  assert.equal(med.image, "/meds/pack-amber.svg");
  let schedule = toggleDoseMedicine(emptyDoseSchedule(), "ante-jentaculum", med);
  assert.equal(schedule.slots["ante-jentaculum"].medicines[0].salt, "Paracetamol");
  assert.equal(schedule.slots["ante-jentaculum"].medicines[0].image, "/meds/pack-amber.svg");
  schedule = setDoseAlarm(schedule, "ante-jentaculum", true);
  assert.equal(schedule.slots["ante-jentaculum"].alarmOn, true);
  schedule = toggleDoseMedicine(schedule, "ante-jentaculum", med);
  assert.equal(schedule.slots["ante-jentaculum"].medicines.length, 0);
  assert.equal(schedule.slots["ante-jentaculum"].alarmOn, false);
});

test("one alarm action covers every dose that has medicines", () => {
  const breakfast = doseMedicineFrom({ id: "med-1", name: "Dolo 650", salt: "Paracetamol" });
  const night = doseMedicineFrom({ id: "med-2", name: "Pantocid", salt: "Pantoprazole" });
  let schedule = toggleDoseMedicine(emptyDoseSchedule(), "ante-jentaculum", breakfast);
  schedule = toggleDoseMedicine(schedule, "hora-somni", night);
  schedule = toggleDoseMedicine(schedule, "sos", night);
  schedule = setAllDoseAlarms(schedule, true);
  assert.equal(schedule.slots["ante-jentaculum"].alarmOn, true);
  assert.equal(schedule.slots["hora-somni"].alarmOn, true);
  assert.equal(schedule.slots["post-jentaculum"].alarmOn, false);
  assert.equal(schedule.slots.sos.alarmOn, false);
  assert.equal(schedule.slots.sos.medicines[0].name, "Pantocid");
});

test("the alarm is due only in its minute and only once that day", () => {
  const med = doseMedicineFrom({ id: "med-2", name: "Pantocid", salt: "Pantoprazole" });
  let schedule = setDoseAlarm(
    toggleDoseMedicine(emptyDoseSchedule(), "hora-somni", med),
    "hora-somni",
    true
  );
  schedule = {
    ...schedule,
    slots: {
      ...schedule.slots,
      "hora-somni": { ...schedule.slots["hora-somni"], time: "22:00" },
    },
  };
  const due = dueDoseAlarms(schedule, new Date(2026, 10, 7, 22, 0, 10));
  assert.equal(due.length, 1);
  assert.equal(due[0].medicines[0].name, "Pantocid");
  assert.equal(dueDoseAlarms(schedule, new Date(2026, 10, 7, 22, 1, 0)).length, 0);
  const fired = markDoseFired(schedule, due[0].stamp, new Date(2026, 10, 7, 22, 0, 20));
  assert.equal(dueDoseAlarms(fired, new Date(2026, 10, 7, 22, 0, 40)).length, 0);
  const taken = recordDoseAnswer(fired, due, true, new Date(2026, 10, 7, 22, 1, 0));
  assert.equal(taken.doseLog[0].taken, true);
  assert.equal(taken.doseLog[0].salt, "Pantoprazole");
  assert.equal(missedDoses(taken).length, 0);
  const missed = recordDoseAnswer(taken, due, false, new Date(2026, 10, 7, 22, 2, 0));
  assert.equal(missed.doseLog.length, 1);
  assert.equal(missedDoses(missed)[0].brand, "Pantocid");
  assert.equal(missedDoses(missed)[0].taken, false);
});
