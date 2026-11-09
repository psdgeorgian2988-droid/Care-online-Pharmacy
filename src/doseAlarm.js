import {
  dueDoseAlarms,
  markDoseFired,
  readDoseSchedule,
  scheduledDoseAlarms,
  writeDoseSchedule,
} from "./doseReminders.js";

export const DOSE_ALARM_EVENT = "mediHomeDoseAlarm";

function alarmLines(item) {
  return item.medicines
    .map((med) => {
      const title = med.brand || med.name;
      return med.salt ? `${title} · ${med.salt}` : title;
    })
    .join("\n");
}

export function playDoseTone(env = globalThis) {
  const AudioCtx = env.AudioContext || env.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const notes = [880, 660, 880];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + index * 0.35 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.35 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.35);
      osc.stop(ctx.currentTime + index * 0.35 + 0.3);
    });
    env.setTimeout?.(() => ctx.close?.(), 1800);
  } catch {
    /* a quiet browser still keeps the on-screen reminder */
  }
}

export function announceDoseAlarm(item, env = globalThis) {
  const title = item.slot.plain;
  const body = alarmLines(item);
  playDoseTone(env);
  const EventCtor = env.CustomEvent || globalThis.CustomEvent;
  if (EventCtor && env.dispatchEvent) {
    env.dispatchEvent(new EventCtor(DOSE_ALARM_EVENT, { detail: item }));
  }
  const Notify = env.Notification;
  if (Notify && Notify.permission === "granted") {
    try {
      new Notify(title, { body, tag: item.stamp });
    } catch {
      /* the tone already sounded */
    }
  }
  return { title, body };
}

export function checkDoseAlarms(env = globalThis, now = new Date()) {
  const storage = env.localStorage;
  const schedule = readDoseSchedule(storage);
  const due = dueDoseAlarms(schedule, now);
  if (!due.length) return [];
  let next = schedule;
  due.forEach((item) => {
    announceDoseAlarm(item, env);
    next = markDoseFired(next, item.stamp, now);
  });
  writeDoseSchedule(next, storage);
  return due;
}

export function scheduleDoseNotifications(schedule, env = globalThis) {
  const ready = env.navigator?.serviceWorker?.ready;
  if (!ready?.then) return Promise.resolve(false);
  const items = scheduledDoseAlarms(schedule).map((item) => ({
    title: item.slot.plain,
    body: alarmLines(item),
    stamp: item.stamp,
    at: item.at,
  }));
  return ready
    .then((registration) => {
      registration.active?.postMessage({ type: "dose-alarms", items });
      return true;
    })
    .catch(() => false);
}

export function startDoseAlarms(env = globalThis) {
  if (!env || env.__mediHomeDoseAlarms) return () => {};
  env.__mediHomeDoseAlarms = true;
  scheduleDoseNotifications(readDoseSchedule(env.localStorage), env);
  const tick = () => checkDoseAlarms(env, new Date());
  const timer = env.setInterval?.(tick, 15000);
  return () => {
    if (timer) env.clearInterval?.(timer);
    env.__mediHomeDoseAlarms = false;
  };
}
