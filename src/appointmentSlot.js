import { isoDateToday, parseIsoDate } from "./personFields.js";

export const LAB_TIME_SLOTS = [
  "7:00 AM - 9:00 AM",
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

export function parseSlotStartMinutes(label) {
  const start = String(label || "")
    .split(/\s*[-–—]\s*/)[0]
    .trim();
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(start);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function minutesFromDate(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

export function isAppointmentDateAllowed(iso, now = new Date()) {
  if (!parseIsoDate(iso)) return false;
  return String(iso) >= isoDateToday(now);
}

export function isOpenAppointmentSlot(label, dateIso, now = new Date()) {
  if (!isAppointmentDateAllowed(dateIso, now)) return false;
  const start = parseSlotStartMinutes(label);
  if (start == null) return false;
  if (String(dateIso) > isoDateToday(now)) return true;
  return start > minutesFromDate(now);
}

export function openAppointmentSlots(slots, dateIso, now = new Date()) {
  const list = slots || [];
  if (!parseIsoDate(dateIso)) return list;
  return list.filter((slot) => isOpenAppointmentSlot(slot, dateIso, now));
}

export function appointmentDateError(iso, now = new Date()) {
  if (!iso) return "Please select a date.";
  if (!isAppointmentDateAllowed(iso, now)) {
    return "Choose today or a later date.";
  }
  return "";
}

export function appointmentSlotError(slot, dateIso, slots = LAB_TIME_SLOTS, now = new Date()) {
  if (!parseIsoDate(dateIso)) {
    return slot ? "" : "Please select a time slot.";
  }
  if (!isAppointmentDateAllowed(dateIso, now)) {
    return "Choose today or a later date.";
  }
  const open = openAppointmentSlots(slots, dateIso, now);
  if (!open.length) {
    return "No time slots left today. Choose a later date.";
  }
  if (!slot) return "Please select a time slot.";
  if (!open.includes(slot)) {
    return "That time slot has already passed. Choose a later slot.";
  }
  return "";
}
