import { isoDateDaysAhead, isoDateToday } from "./personFields.js";

export const WEBINAR_TOPICS = [
  {
    id: "wb-diabetes",
    title: "Diabetes At Home: Medicines, Meals, And HbA1c",
    host: "MediHome clinical educators",
    format: "Live online (link by WhatsApp)",
    summary:
      "How to take diabetes medicines on time, what to eat around doses, and which tests to book.",
  },
  {
    id: "wb-bp",
    title: "Blood Pressure: Home Readings That Doctors Trust",
    host: "MediHome nursing team",
    format: "Live online (link by WhatsApp)",
    summary:
      "Correct cuff use, when a high reading is an emergency, and why BP tablets continue even on good days.",
  },
  {
    id: "wb-meds",
    title: "Medicine Safety For Caregivers",
    host: "MediHome pharmacy desk",
    format: "Live online (link by WhatsApp)",
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
export const WEBINAR_BOOK_DAYS_AHEAD = 90;

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
    format: String(raw.format || topic?.format || "Live online (link by WhatsApp)").trim(),
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

export function isWebinarBookable(webinar, today = isoDateToday()) {
  return isWebinarScheduled(webinar, today);
}

export function bookableWebinars(list, today = isoDateToday()) {
  return normalizeWebinars(list).filter((row) => isWebinarBookable(row, today));
}

export function webinarNotice(list, seenId = "", today = isoDateToday()) {
  const next = bookableWebinars(list, today)[0] || null;
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
