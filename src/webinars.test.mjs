import test from "node:test";
import assert from "node:assert/strict";
import {
  bookableWebinars,
  isWebinarBookable,
  scheduleWebinar,
  webinarNotice,
  cancelWebinar,
} from "./webinars.js";

test("booking is closed until staff schedules a date and time", () => {
  const catalog = {
    id: "wb-diabetes",
    title: "Diabetes At Home: Medicines, Meals, And HbA1c",
    status: "",
    date: "",
    time: "",
  };
  assert.equal(isWebinarBookable(catalog, "2026-08-30"), false);
  assert.deepEqual(bookableWebinars([catalog], "2026-08-30"), []);
});

test("a scheduled future webinar can be booked and raises an in-app notice", () => {
  const made = scheduleWebinar({
    topicId: "wb-diabetes",
    date: "2026-09-05",
    time: "11:00 AM – 12:00 PM",
    now: Date.parse("2026-08-30T10:00:00+05:30"),
  });
  assert.equal(made.ok, true);
  assert.equal(isWebinarBookable(made.webinar, "2026-08-30"), true);
  assert.equal(webinarNotice([made.webinar], "", "2026-08-30")?.id, made.webinar.id);
  assert.equal(webinarNotice([made.webinar], made.webinar.id, "2026-08-30"), null);
});

test("past or cancelled webinars cannot be booked", () => {
  const past = {
    id: "old",
    title: "Diabetes At Home: Medicines, Meals, And HbA1c",
    date: "2026-08-01",
    time: "11:00 AM – 12:00 PM",
    status: "scheduled",
  };
  assert.equal(isWebinarBookable(past, "2026-08-30"), false);
  const live = {
    id: "live",
    title: "Medicine Safety For Caregivers",
    date: "2026-09-27",
    time: "10:00 AM – 10:45 AM",
    status: "scheduled",
  };
  const cancelled = cancelWebinar([live], "live")[0];
  assert.equal(isWebinarBookable(cancelled, "2026-08-30"), false);
  assert.equal(webinarNotice([cancelled], "", "2026-08-30"), null);
});
