import test from "node:test";
import assert from "node:assert/strict";
import {
  LAB_TIME_SLOTS,
  appointmentDateError,
  appointmentSlotError,
  isAppointmentDateAllowed,
  isOpenAppointmentSlot,
  openAppointmentSlots,
  parseSlotStartMinutes,
} from "./appointmentSlot.js";

const now = new Date(2026, 7, 28, 10, 30, 0);

test("slot labels parse to minutes from midnight", () => {
  assert.equal(parseSlotStartMinutes("7:00 AM - 9:00 AM"), 7 * 60);
  assert.equal(parseSlotStartMinutes("11:00 AM - 1:00 PM"), 11 * 60);
  assert.equal(parseSlotStartMinutes("2:00 PM - 4:00 PM"), 14 * 60);
  assert.equal(parseSlotStartMinutes("08:00 AM – 10:00 AM"), 8 * 60);
});

test("lab appointment date must be today or later", () => {
  assert.equal(isAppointmentDateAllowed("2026-08-27", now), false);
  assert.equal(isAppointmentDateAllowed("2026-08-28", now), true);
  assert.equal(isAppointmentDateAllowed("2026-08-29", now), true);
  assert.match(appointmentDateError("2026-08-27", now), /today or a later date/);
});

test("lab appointment date cannot be more than one week ahead", () => {
  assert.equal(isAppointmentDateAllowed("2026-09-04", now), true);
  assert.equal(isAppointmentDateAllowed("2026-09-05", now), false);
  assert.match(appointmentDateError("2026-09-05", now), /next 7 days/);
});

test("today only keeps time slots that start after now", () => {
  const open = openAppointmentSlots(LAB_TIME_SLOTS, "2026-08-28", now);
  assert.deepEqual(open, [
    "11:00 AM - 1:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
  ]);
  assert.equal(isOpenAppointmentSlot("9:00 AM - 11:00 AM", "2026-08-28", now), false);
  assert.equal(isOpenAppointmentSlot("11:00 AM - 1:00 PM", "2026-08-28", now), true);
  assert.match(
    appointmentSlotError("7:00 AM - 9:00 AM", "2026-08-28", LAB_TIME_SLOTS, now),
    /already passed/
  );
});

test("a later date keeps every lab slot", () => {
  assert.deepEqual(
    openAppointmentSlots(LAB_TIME_SLOTS, "2026-08-29", now),
    LAB_TIME_SLOTS
  );
  assert.deepEqual(openAppointmentSlots(LAB_TIME_SLOTS, "", now), LAB_TIME_SLOTS);
});
