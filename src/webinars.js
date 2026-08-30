import { isoDateDaysAhead, isoDateToday } from "./personFields.js";

export const WEBINAR_TOPICS = [
  {
    id: "wb-diabetes",
    title: "Diabetes At Home: Medicines, Meals, And HbA1c",
    host: "MediHome clinical educators",
    format: "Live in-app session",
    summary:
      "How to take diabetes medicines on time, what to eat around doses, and which tests to book.",
  },
  {
    id: "wb-bp",
    title: "Blood Pressure: Home Readings That Doctors Trust",
    host: "MediHome nursing team",
    format: "Live in-app session",
    summary:
      "Correct cuff use, when a high reading is an emergency, and why BP tablets continue even on good days.",
  },
  {
    id: "wb-meds",
    title: "Medicine Safety For Caregivers",
    host: "MediHome pharmacy desk",
    format: "Live in-app session",
    summary:
      "Storage, missed doses, look-alike packs, and when to call before giving an extra tablet.",
  },
];

export const WEBINAR_TIME_SLOTS = [
  "10:00 AM – 10:45 AM",
  "11:00 AM – 12:00 PM",
  "4:00 PM – 4:45 PM",
  "6:30 PM – 7:15 PM",
];

export const WEBINAR_NOTICE_KEY = "mediHomeWebinarNoticeSeen";
export const WEBINAR_CACHE_KEY = "mediHomeWebinars";
export const WEBINAR_EVENT = "medihome-webinars";
export const WEBINAR_SIGNUP_KEY = "mediHomeWebinarSignups";
export const WEBINAR_ATTENDANCE_KEY = "mediHomeWebinarAttendance";
export const WEBINAR_BOOK_DAYS_AHEAD = 90;
export const WEBINAR_LIVE_FORMAT = "Live in-app session";
export const WEBINAR_JOIN_LATE_MS = 5 * 60 * 1000;
export const WEBINAR_AWAY_MS = 20 * 1000;
export const WEBINAR_END_GRACE_MS = 15 * 1000;

const CLOCK_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

export function webinarTopicById(id) {
  return WEBINAR_TOPICS.find((row) => row.id === String(id || "")) || null;
}

export function formatWebinarDate(iso) {
  const value = String(iso || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T12:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function normalizeWebinar(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object") return null;
  const topic = webinarTopicById(raw.topicId || raw.catalogId || raw.id);
  const title = String(raw.title || topic?.title || "").trim();
  const date = String(raw.date || "").trim();
  const time = String(raw.time || "").trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) return null;
  const status = String(raw.status || "scheduled").toLowerCase() === "cancelled"
    ? "cancelled"
    : "scheduled";
  const id = String(raw.id || "").trim() || `wb-${date}-${shortId(title, now)}`;
  return {
    id,
    topicId: String(raw.topicId || raw.catalogId || topic?.id || "").trim(),
    title,
    date,
    time,
    host: String(raw.host || topic?.host || "MediHome").trim(),
    format: String(raw.format || topic?.format || WEBINAR_LIVE_FORMAT).trim(),
    summary: String(raw.summary || topic?.summary || "").trim(),
    status,
    scheduledAt: Number(raw.scheduledAt) || now,
  };
}

function shortId(title, now) {
  const slug = String(title || "webinar")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 8);
  return `${slug || "session"}-${Number(now).toString(36)}`;
}

export function normalizeWebinars(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const rows = [];
  for (const item of raw) {
    const webinar = normalizeWebinar(item);
    if (!webinar || seen.has(webinar.id)) continue;
    seen.add(webinar.id);
    rows.push(webinar);
  }
  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
}

export function isWebinarScheduled(webinar, today = isoDateToday()) {
  return (
    webinar?.status === "scheduled" &&
    String(webinar.date || "") >= String(today || "")
  );
}

export function isWebinarBookable(webinar, today = isoDateToday(), nowMs) {
  if (!isWebinarScheduled(webinar, today)) return false;
  if (nowMs == null) return true;
  const bounds = webinarSessionBounds(webinar);
  if (!bounds) return true;
  return nowMs < bounds.startMs;
}

export function bookableWebinars(list, today = isoDateToday(), nowMs) {
  return normalizeWebinars(list).filter((row) =>
    isWebinarBookable(row, today, nowMs)
  );
}

export function webinarNotice(list, seenId = "", today = isoDateToday(), nowMs) {
  const next = bookableWebinars(list, today, nowMs)[0] || null;
  if (!next) return null;
  if (String(seenId || "") === next.id) return null;
  return next;
}

export function scheduleWebinar({ topicId, date, time, now = Date.now() } = {}) {
  const topic = webinarTopicById(topicId);
  if (!topic) return { ok: false, error: "Choose a webinar topic." };
  const day = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: "Choose a date." };
  const today = isoDateToday(new Date(now));
  const max = isoDateDaysAhead(WEBINAR_BOOK_DAYS_AHEAD, new Date(now));
  if (day < today) return { ok: false, error: "Choose today or a later date." };
  if (day > max) return { ok: false, error: "Choose a date within 90 days." };
  const slot = String(time || "").trim();
  if (!WEBINAR_TIME_SLOTS.includes(slot)) return { ok: false, error: "Choose a time slot." };
  return {
    ok: true,
    webinar: normalizeWebinar(
      {
        topicId: topic.id,
        title: topic.title,
        host: topic.host,
        format: topic.format,
        summary: topic.summary,
        date: day,
        time: slot,
        status: "scheduled",
        scheduledAt: now,
      },
      now
    ),
  };
}

export function cancelWebinar(list, id) {
  return normalizeWebinars(list).map((row) =>
    row.id === String(id || "") ? { ...row, status: "cancelled" } : row
  );
}

export function readSeenWebinarNotice() {
  try {
    return String(localStorage.getItem(WEBINAR_NOTICE_KEY) || "");
  } catch {
    return "";
  }
}

export function writeSeenWebinarNotice(id) {
  try {
    localStorage.setItem(WEBINAR_NOTICE_KEY, String(id || ""));
  } catch {
    /* ignore */
  }
}

export function readCachedWebinars() {
  try {
    return normalizeWebinars(JSON.parse(sessionStorage.getItem(WEBINAR_CACHE_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function cacheWebinars(list) {
  const webinars = normalizeWebinars(list);
  try {
    sessionStorage.setItem(WEBINAR_CACHE_KEY, JSON.stringify(webinars));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WEBINAR_EVENT, { detail: webinars }));
  }
  return webinars;
}

export function parseClockToMinutes(token) {
  const match = CLOCK_RE.exec(String(token || "").trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function isoTimeFromMinutes(mins) {
  const wrapped = ((Number(mins) % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export function webinarSessionBounds(webinar) {
  const date = String(webinar?.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parts = String(webinar?.time || "").split(/\s*[-–—]\s*/);
  if (parts.length < 2) return null;
  const startMin = parseClockToMinutes(parts[0]);
  const endMin = parseClockToMinutes(parts[1]);
  if (startMin == null || endMin == null) return null;
  const startMs = Date.parse(`${date}T${isoTimeFromMinutes(startMin)}+05:30`);
  let endMs = Date.parse(`${date}T${isoTimeFromMinutes(endMin)}+05:30`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000;
  return {
    startMs,
    endMs,
    joinCloseMs: startMs + WEBINAR_JOIN_LATE_MS,
  };
}

export function formatIstClock(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value)) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function webinarSessionHref(id) {
  return `#education?service=webinars&id=${encodeURIComponent(String(id || ""))}`;
}

export function joinWindowState(webinar, nowMs = Date.now()) {
  if (webinar?.status === "cancelled") return "cancelled";
  const bounds = webinarSessionBounds(webinar);
  if (!bounds) return "unscheduled";
  if (nowMs < bounds.startMs) return "upcoming";
  if (nowMs <= bounds.joinCloseMs) return "join_open";
  if (nowMs < bounds.endMs) return "too_late";
  return "ended";
}

export function emptyAttendance() {
  return {
    joinedAt: 0,
    startCheckAt: 0,
    lastSeenAt: 0,
    hiddenAt: 0,
    leftEarlyAt: 0,
    endCheckAt: 0,
  };
}

export function canJoinWebinar(webinar, nowMs = Date.now(), record) {
  if (webinar?.status === "cancelled") return false;
  const bounds = webinarSessionBounds(webinar);
  if (!bounds) return false;
  if (record?.leftEarlyAt) return false;
  if (record?.endCheckAt) return false;
  if (record?.joinedAt) return nowMs < bounds.endMs;
  return joinWindowState(webinar, nowMs) === "join_open";
}

export function markJoin(webinar, nowMs = Date.now(), record) {
  if (record?.joinedAt && !record.leftEarlyAt && !record.endCheckAt) {
    if (!canJoinWebinar(webinar, nowMs, record)) {
      return { ok: false, reason: joinWindowState(webinar, nowMs), record };
    }
    return { ok: true, already: true, record };
  }
  const state = joinWindowState(webinar, nowMs);
  if (state !== "join_open") {
    return { ok: false, reason: state, record: record || emptyAttendance() };
  }
  const next = {
    ...emptyAttendance(),
    joinedAt: nowMs,
    startCheckAt: nowMs,
    lastSeenAt: nowMs,
  };
  return { ok: true, already: false, record: next };
}

export function markLeftEarly(record, nowMs = Date.now()) {
  if (!record?.joinedAt || record.endCheckAt || record.leftEarlyAt) return record;
  return { ...record, leftEarlyAt: nowMs };
}

export function tickAttendance(
  webinar,
  record,
  nowMs = Date.now(),
  { visible = true, awayMs = WEBINAR_AWAY_MS } = {}
) {
  if (!record?.joinedAt || record.endCheckAt || record.leftEarlyAt) return record;
  const bounds = webinarSessionBounds(webinar);
  if (!bounds) return record;
  if (!visible) {
    const hiddenAt = record.hiddenAt || nowMs;
    if (nowMs - hiddenAt >= awayMs) {
      return { ...record, hiddenAt, leftEarlyAt: nowMs };
    }
    return { ...record, hiddenAt };
  }
  const next = { ...record, hiddenAt: 0, lastSeenAt: nowMs };
  if (nowMs >= bounds.endMs) {
    return { ...next, endCheckAt: nowMs };
  }
  return next;
}

export function attendanceOutcome(webinar, record, nowMs = Date.now()) {
  if (webinar?.status === "cancelled") return "cancelled";
  const bounds = webinarSessionBounds(webinar);
  if (!bounds) return "unscheduled";
  if (!record?.joinedAt || !record.startCheckAt) {
    if (nowMs < bounds.startMs) return "not_started";
    if (nowMs <= bounds.joinCloseMs) return "not_joined";
    return "missed_join";
  }
  if (record.leftEarlyAt) return "left_early";
  if (record.endCheckAt) return "complete";
  if (nowMs < bounds.endMs) return "in_session";
  if ((record.lastSeenAt || 0) >= bounds.endMs - WEBINAR_END_GRACE_MS) {
    return "complete";
  }
  return "missed_end";
}

export function shouldCreditWebinarPoints(webinar, record, nowMs = Date.now()) {
  return attendanceOutcome(webinar, record, nowMs) === "complete";
}

export function loadAttendanceMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEBINAR_ATTENDANCE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function readAttendance(id) {
  const row = loadAttendanceMap()[String(id || "")];
  return row && typeof row === "object" ? row : null;
}

export function writeAttendance(id, record) {
  const map = loadAttendanceMap();
  map[String(id || "")] = record;
  try {
    localStorage.setItem(WEBINAR_ATTENDANCE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  return record;
}
