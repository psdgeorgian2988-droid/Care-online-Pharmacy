import test from "node:test";
import assert from "node:assert/strict";
import {
  attendanceOutcome,
  bookableWebinars,
  canJoinWebinar,
  isWebinarBookable,
  joinWindowState,
  markJoin,
  markLeftEarly,
  scheduleWebinar,
  shouldCreditWebinarPoints,
  tickAttendance,
  webinarNotice,
  webinarSessionBounds,
  cancelWebinar,
  WEBINAR_JOIN_LATE_MS,
} from "./webinars.js";

const TODAY = "2026-08-30";
const SLOT = "11:00 AM – 12:00 PM";
const START = Date.parse("2026-08-30T11:00:00+05:30");
const END = Date.parse("2026-08-30T12:00:00+05:30");

function liveWebinar(overrides = {}) {
  return {
    id: "wb-live",
    title: "Diabetes At Home: Medicines, Meals, And HbA1c",
    date: TODAY,
    time: SLOT,
    status: "scheduled",
    ...overrides,
  };
}

test("booking is closed until staff schedules a date and time", () => {
  const catalog = {
    id: "wb-diabetes",
    title: "Diabetes At Home: Medicines, Meals, And HbA1c",
    status: "",
    date: "",
    time: "",
  };
  assert.equal(isWebinarBookable(catalog, TODAY), false);
  assert.deepEqual(bookableWebinars([catalog], TODAY), []);
});

test("a scheduled future webinar can be booked and raises an in-app notice", () => {
  const made = scheduleWebinar({
    topicId: "wb-diabetes",
    date: "2026-09-05",
    time: SLOT,
    now: Date.parse("2026-08-30T10:00:00+05:30"),
  });
  assert.equal(made.ok, true);
  assert.equal(isWebinarBookable(made.webinar, TODAY), true);
  assert.equal(webinarNotice([made.webinar], "", TODAY)?.id, made.webinar.id);
  assert.equal(webinarNotice([made.webinar], made.webinar.id, TODAY), null);
});

test("past or cancelled webinars cannot be booked", () => {
  const past = {
    id: "old",
    title: "Diabetes At Home: Medicines, Meals, And HbA1c",
    date: "2026-08-01",
    time: SLOT,
    status: "scheduled",
  };
  assert.equal(isWebinarBookable(past, TODAY), false);
  const live = {
    id: "live",
    title: "Medicine Safety For Caregivers",
    date: "2026-09-27",
    time: "10:00 AM – 10:45 AM",
    status: "scheduled",
  };
  const cancelled = cancelWebinar([live], "live")[0];
  assert.equal(isWebinarBookable(cancelled, TODAY), false);
  assert.equal(webinarNotice([cancelled], "", TODAY), null);
});

test("booking closes when the session starts", () => {
  const webinar = liveWebinar();
  assert.equal(isWebinarBookable(webinar, TODAY, START - 60 * 1000), true);
  assert.equal(isWebinarBookable(webinar, TODAY, START), false);
  assert.equal(webinarNotice([webinar], "", TODAY, START), null);
});

test("join window is start through 5 minutes late, not before", () => {
  const webinar = liveWebinar();
  assert.equal(joinWindowState(webinar, START - 60 * 1000), "upcoming");
  assert.equal(canJoinWebinar(webinar, START - 60 * 1000), false);
  assert.equal(markJoin(webinar, START - 60 * 1000).ok, false);

  assert.equal(joinWindowState(webinar, START), "join_open");
  assert.equal(canJoinWebinar(webinar, START), true);
  assert.equal(markJoin(webinar, START).ok, true);

  const atFive = START + WEBINAR_JOIN_LATE_MS;
  assert.equal(joinWindowState(webinar, atFive), "join_open");
  assert.equal(markJoin(webinar, atFive).ok, true);

  const tooLate = START + WEBINAR_JOIN_LATE_MS + 1000;
  assert.equal(joinWindowState(webinar, tooLate), "too_late");
  assert.equal(canJoinWebinar(webinar, tooLate), false);
  assert.equal(markJoin(webinar, tooLate).ok, false);
  assert.equal(attendanceOutcome(webinar, null, tooLate), "missed_join");
});

test("points credit only after start checkpoint, full stay, and end checkpoint", () => {
  const webinar = liveWebinar();
  const bounds = webinarSessionBounds(webinar);
  assert.equal(bounds.startMs, START);
  assert.equal(bounds.endMs, END);

  const joined = markJoin(webinar, START + 3 * 60 * 1000);
  assert.equal(joined.ok, true);
  assert.equal(shouldCreditWebinarPoints(webinar, joined.record, START + 3 * 60 * 1000), false);

  let record = joined.record;
  record = tickAttendance(webinar, record, START + 30 * 60 * 1000, { visible: true });
  assert.equal(attendanceOutcome(webinar, record, START + 30 * 60 * 1000), "in_session");
  assert.equal(shouldCreditWebinarPoints(webinar, record, START + 30 * 60 * 1000), false);

  record = tickAttendance(webinar, record, END, { visible: true });
  assert.equal(Boolean(record.endCheckAt), true);
  assert.equal(attendanceOutcome(webinar, record, END), "complete");
  assert.equal(shouldCreditWebinarPoints(webinar, record, END), true);
});

test("leaving early or missing the join does not credit points", () => {
  const webinar = liveWebinar();
  const joined = markJoin(webinar, START + 60 * 1000);
  const left = markLeftEarly(joined.record, START + 20 * 60 * 1000);
  assert.equal(attendanceOutcome(webinar, left, END), "left_early");
  assert.equal(shouldCreditWebinarPoints(webinar, left, END), false);

  let hidden = tickAttendance(webinar, joined.record, START + 2 * 60 * 1000, {
    visible: false,
  });
  hidden = tickAttendance(webinar, hidden, START + 2 * 60 * 1000 + 20 * 1000, {
    visible: false,
  });
  assert.equal(attendanceOutcome(webinar, hidden, START + 3 * 60 * 1000), "left_early");
  assert.equal(shouldCreditWebinarPoints(webinar, hidden, END), false);

  assert.equal(shouldCreditWebinarPoints(webinar, null, END), false);
});
