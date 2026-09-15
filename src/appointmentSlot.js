import { isoDateMonthsAhead, isoDateToday, parseIsoDate } from "./personFields.js";

export const LAB_TIME_SLOTS = [
  "7:00 AM - 9:00 AM",
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

/** How far ahead customers may book appointments (lab, home care, etc.). */
export const BOOKING_MONTHS_AHEAD = 6;
export const LAB_BOOKING_MONTHS_AHEAD = BOOKING_MONTHS_AHEAD;
/** @deprecated Use BOOKING_MONTHS_AHEAD — kept for older imports. */
export const LAB_BOOKING_DAYS_AHEAD = BOOKING_MONTHS_AHEAD * 30;
export const BOOKING_DAYS_AHEAD = LAB_BOOKING_DAYS_AHEAD;

export function bookingMaxDate(now = new Date()) {
  return isoDateMonthsAhead(BOOKING_MONTHS_AHEAD, now);
}

export function labBookingMaxDate(now = new Date()) {
  return bookingMaxDate(now);
}

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
  const value = String(iso);
  return value >= isoDateToday(now) && value <= labBookingMaxDate(now);
}

export const LAB_LEAD_MINUTES = 4 * 60;

export function appointmentSlotStartMs(dateIso, label) {
  const start = parseSlotStartMinutes(label);
  if (start == null || !parseIsoDate(dateIso)) return null;
  const [year, month, day] = String(dateIso).split("-").map(Number);
  return new Date(year, month - 1, day, Math.floor(start / 60), start % 60, 0, 0).getTime();
}

export function isOpenAppointmentSlot(
  label,
  dateIso,
  now = new Date(),
  leadMinutes = LAB_LEAD_MINUTES
) {
  if (!isAppointmentDateAllowed(dateIso, now)) return false;
  const startMs = appointmentSlotStartMs(dateIso, label);
  if (startMs == null) return false;
  return startMs >= now.getTime() + Number(leadMinutes || 0) * 60 * 1000;
}

export function openAppointmentSlots(slots, dateIso, now = new Date()) {
  const list = slots || [];
  if (!parseIsoDate(dateIso)) return list;
  return list.filter((slot) => isOpenAppointmentSlot(slot, dateIso, now));
}

export function appointmentDateError(iso, now = new Date()) {
  if (!iso) return "Please select a date.";
  if (!parseIsoDate(iso) || String(iso) < isoDateToday(now)) {
    return "Choose today or a later date.";
  }
  if (String(iso) > labBookingMaxDate(now)) {
    return "Book within the next 6 months.";
  }
  return "";
}

export function appointmentSlotError(slot, dateIso, slots = LAB_TIME_SLOTS, now = new Date()) {
  if (!parseIsoDate(dateIso)) {
    return slot ? "" : "Please select a time slot.";
  }
  const dateError = appointmentDateError(dateIso, now);
  if (dateError) return dateError;
  const open = openAppointmentSlots(slots, dateIso, now);
  if (!open.length) {
    return "No open slots at least 4 hours from now. Choose a later date or time.";
  }
  if (!slot) return "Please select a time slot.";
  if (!open.includes(slot)) {
    return "Choose a slot at least 4 hours from now.";
  }
  return "";
}
