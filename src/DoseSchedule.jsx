import { useEffect, useState } from "react";
import { usePublicCatalog } from "./catalogClient";
import {
  DOSE_REMINDER_EVENT,
  DOSE_SLOTS,
  diabetesBpDoseMedicines,
  missedDoses,
  readDoseSchedule,
  setAllDoseAlarms,
  setDoseMedicines,
  writeDoseSchedule,
} from "./doseReminders";
import { scheduleDoseNotifications } from "./doseAlarm";

function doseDayLabel(day) {
  const [year, month, date] = String(day || "").split("-").map(Number);
  if (!year || !month || !date) return "";
  return new Date(year, month - 1, date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function foldName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function catalogStrip(catalogMeds, med) {
  const tokens = [med?.name, med?.salt].map(foldName).filter((token) => token.length > 3);
  return (catalogMeds || []).find((row) => {
    const image = String(row?.image || "");
    const photo = image.includes("/photos/") || image.startsWith("data:image");
    if (!photo) return false;
    const blob = foldName([row.name, row.brand, row.salt, ...(row.aliases || [])].join(" "));
    return tokens.some((token) => blob.includes(token));
  });
}

function prescriptionMedicines(catalogMeds = []) {
  return diabetesBpDoseMedicines().map((med) => {
    const photo = catalogStrip(catalogMeds, med);
    return photo?.image ? { ...med, image: photo.image } : med;
  });
}

function chosenIds(schedule, slotId) {
  return new Set((schedule?.slots?.[slotId]?.medicines || []).map((med) => med.id));
}

function AlarmMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8.2 9.4a6 6 0 0 1 4.1-3.5" />
      <path d="M23.8 9.4a6 6 0 0 0-4.1-3.5" />
      <circle cx="16" cy="17" r="7.1" />
      <path d="M16 17V13.1M16 17l3.2 2.1" />
      <path d="M11.1 24.5l-2.2 3.1M20.9 24.5l2.2 3.1" />
      <path d="M16 9.8V8" />
    </svg>
  );
}

function ScheduleMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="6.5" y="4.5" width="19" height="23" rx="3.2" />
      <path d="M6.5 10.2h19" />
      <circle className="dose-dot" cx="11" cy="14.3" r="1.05" />
      <path d="M13.7 14.3h8" />
      <circle className="dose-dot" cx="11" cy="18.5" r="1.05" />
      <path d="M13.7 18.5h8" />
      <circle className="dose-dot" cx="11" cy="22.7" r="1.05" />
      <rect x="13.5" y="21.3" width="8.2" height="2.8" rx="1.4" />
      <path d="M17.6 21.3v2.8" />
    </svg>
  );
}

export default function DoseSchedule() {
  const catalog = usePublicCatalog();
  const [medicines, setMedicines] = useState(() => prescriptionMedicines());
  const [schedule, setSchedule] = useState(() => readDoseSchedule());
  const [slotId, setSlotId] = useState(DOSE_SLOTS[0].id);
  const [draftIds, setDraftIds] = useState(() => chosenIds(readDoseSchedule(), DOSE_SLOTS[0].id));
  const [notice, setNotice] = useState("");
  const [missedOpen, setMissedOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setMedicines(prescriptionMedicines(catalog.medicines));
      setSchedule(readDoseSchedule());
    };
    window.addEventListener(DOSE_REMINDER_EVENT, refresh);
    window.addEventListener("storage", refresh);
    refresh();
    return () => {
      window.removeEventListener(DOSE_REMINDER_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [catalog.medicines]);

  useEffect(() => {
    setDraftIds(chosenIds(schedule, slotId));
  }, [schedule, slotId]);

  const slot = DOSE_SLOTS.find((item) => item.id === slotId) || DOSE_SLOTS[0];
  const scheduled = DOSE_SLOTS.filter((item) => !item.asNeeded && schedule.slots[item.id]?.medicines?.length);
  const missed = missedDoses(schedule);
  const alarmsArmed = scheduled.length > 0 && scheduled.every((item) => schedule.slots[item.id]?.alarmOn);
  const armedPlan = DOSE_SLOTS.filter((item) => {
    const row = schedule.slots[item.id];
    return !item.asNeeded && row?.alarmOn && row.medicines?.length;
  }).map((item) => ({
    ...item,
    time: schedule.slots[item.id].time || item.time,
    medicines: schedule.slots[item.id].medicines,
  }));

  const store = (next) => {
    setSchedule(next);
    writeDoseSchedule(next);
  };

  const draftMedicines = () => medicines.filter((med) => draftIds.has(med.id));

  const toggle = (med) => {
    setDraftIds((current) => {
      const next = new Set(current);
      if (next.has(med.id)) next.delete(med.id);
      else next.add(med.id);
      return next;
    });
    setNotice("");
  };

  const saveTime = (nextSlotId = slot.id) => {
    const next = setDoseMedicines(schedule, slot.id, draftMedicines());
    store(next);
    if (nextSlotId !== slot.id) setSlotId(nextSlotId);
    setNotice(`Saved for ${slot.plain}.`);
    return next;
  };

  const arm = async () => {
    const next = setDoseMedicines(schedule, slot.id, draftMedicines());
    const timed = DOSE_SLOTS.filter((item) => !item.asNeeded && next.slots[item.id]?.medicines?.length);
    if (!timed.length) {
      setNotice("Tick the medicines for this time, then save.");
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* the alarm still rings while this app is open */
      }
    }
    const armed = setAllDoseAlarms(next, true);
    store(armed);
    scheduleDoseNotifications(armed);
    setNotice("");
  };

  return (
    <section className="dose-schedule" aria-label="Dose times">
      <style>{`
        .dose-schedule{display:grid;gap:8px;margin:8px 0 4px;padding:10px;border:1px solid #d7e2e9;border-radius:12px;background:#f7fbfb}
        .dose-schedule h2{margin:0;font-size:16px;color:#143246}
        .dose-schedule .dose-lead{margin:0;color:#5d7180;font-size:12px;line-height:1.35}
        .dose-time{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34546b}
        .dose-time select{width:100%;min-height:36px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px;font-weight:700}
        .dose-open{display:grid;gap:6px;margin:0;padding:0;list-style:none}
        .dose-open label{display:flex;gap:8px;align-items:center;padding:6px;border:1px solid #e4ecef;border-radius:10px;background:#fff;cursor:pointer}
        .dose-open input{margin:0}
        .dose-open img{width:48px;height:32px;object-fit:contain;flex:0 0 48px;border-radius:6px;background:#f4f8f8}
        .dose-open strong{display:block;color:#143246;font-size:13px}
        .dose-open em{display:block;font-style:normal;color:#5d7180;font-size:11px}
        .dose-actions{display:flex;gap:8px;flex-wrap:wrap}
        .dose-arm,.dose-save{min-height:34px;padding:6px 14px;border-radius:8px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
        .dose-save{border:1px solid #1a6b7a;background:#fff;color:#1a6b7a}
        .dose-arm{border:0;background:#1a6b7a;color:#fff}
        .dose-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:360px}
        .dose-tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:78px;padding:10px 8px 8px;border:1px solid #d7e4ea;border-radius:16px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 1px 2px rgba(20,50,70,.05)}
        .dose-tab svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .dose-tab .dose-dot{fill:currentColor;stroke:none}
        .dose-tab.is-on{background:#1a6b7a;color:#fff;border-color:#1a6b7a;box-shadow:0 8px 16px rgba(26,107,122,.18)}
        .dose-tab.is-open{background:#eef7f8;border-color:#1a6b7a}
        .dose-plan{display:grid;gap:8px;margin:0;padding:0;list-style:none;max-width:360px}
        .dose-plan > li{display:grid;gap:6px;padding:8px;border:1px solid #e4ecef;border-radius:12px;background:#fff}
        .dose-plan header{display:flex;justify-content:flex-start;align-items:baseline;gap:8px}
        .dose-plan header strong{color:#143246;font-size:13px}
        .dose-plan header span{color:#1a6b7a;font-size:12px;font-weight:800}
        .dose-plan ul{display:grid;gap:6px;margin:0;padding:0;list-style:none}
        .dose-plan-med{display:flex;gap:8px;align-items:center}
        .dose-plan-med img{width:48px;height:32px;object-fit:contain;flex:0 0 48px;border-radius:6px;background:#f4f8f8}
        .dose-plan-med strong{display:block;color:#143246;font-size:13px}
        .dose-plan-med em{display:block;font-style:normal;color:#5d7180;font-size:11px}
        .dose-notice{margin:0;color:#1a6b7a;font-size:12px;font-weight:700}
        .dose-missed{display:grid;gap:6px;margin-top:4px}
        .dose-missed-tab{justify-self:start;min-height:34px;padding:6px 14px;border:1px solid #1a6b7a;border-radius:8px;background:#fff;color:#1a6b7a;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
        .dose-missed h3{margin:0;font-size:14px;color:#143246}
        .dose-missed p{margin:0;color:#5d7180;font-size:12px}
        .dose-missed ul{display:grid;gap:6px;margin:0;padding:0;list-style:none}
        .dose-missed li{display:flex;gap:8px;align-items:center;padding:6px;border:1px solid #f0d4d4;border-radius:10px;background:#fff}
        .dose-missed img{width:48px;height:32px;object-fit:contain;flex:0 0 48px;border-radius:6px;background:#f7fbfb}
        .dose-missed strong{display:block;color:#143246;font-size:13px}
        .dose-missed em{display:block;font-style:normal;color:#5d7180;font-size:11px}
        .dose-missed small{display:block;color:#9b2c2c;font-size:11px;font-weight:700}
      `}</style>
      {alarmsArmed ? null : <h2>Dose schedule</h2>}
      {alarmsArmed ? (
        <>
          <div className="dose-tabs" role="group" aria-label="Alarm and dose schedule">
            <button
              type="button"
              className="dose-tab is-on"
              onClick={() => {
                setPlanOpen(false);
                const cleared = setAllDoseAlarms(schedule, false);
                store(cleared);
                scheduleDoseNotifications(cleared);
              }}
            >
              <AlarmMark />
              <span>Alarm</span>
            </button>
            <button
              type="button"
              className={`dose-tab${planOpen ? " is-open" : ""}`}
              aria-expanded={planOpen}
              onClick={() => setPlanOpen((open) => !open)}
            >
              <ScheduleMark />
              <span>Dose schedule</span>
            </button>
          </div>
          {planOpen ? (
            <ul className="dose-plan" aria-label="Dose schedule">
              {armedPlan.map((item) => (
                <li key={item.id}>
                  <header>
                    <strong>{item.plain}</strong>
                    <span>{item.time}</span>
                  </header>
                  <ul>
                    {item.medicines.map((med) => (
                      <li key={med.id} className="dose-plan-med">
                        <img src={med.image || "/meds/pack-navy.svg"} alt="" />
                        <span>
                          <strong>{med.brand || med.name}</strong>
                          <em>{med.salt || "Salt not listed"}</em>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <>
          <p className="dose-lead">
            Choose a time, tick the medicines, and save. Then choose the next time.
          </p>
          <label className="dose-time">
            Time
            <select
              aria-label="Dose time"
              value={slot.id}
              onChange={(event) => saveTime(event.target.value)}
            >
              {DOSE_SLOTS.map((item) => (
                <option key={item.id} value={item.id}>{item.plain}</option>
              ))}
            </select>
          </label>
          <ul className="dose-open" aria-label={`${slot.plain} medicines`}>
            {medicines.map((med) => (
              <li key={med.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={draftIds.has(med.id)}
                    onChange={() => toggle(med)}
                  />
                  <img src={med.image} alt="" />
                  <span>
                    <strong>{med.brand}</strong>
                    <em>{med.salt || "Salt not listed"}</em>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {notice ? <p className="dose-notice">{notice}</p> : null}
          <div className="dose-actions">
            <button type="button" className="dose-save" onClick={() => saveTime()}>Save</button>
            <button type="button" className="dose-arm" onClick={() => arm()}>Set alarm</button>
          </div>
        </>
      )}
      <section className="dose-missed" aria-label="Missed doses">
        <button
          type="button"
          className="dose-missed-tab"
          aria-expanded={missedOpen}
          onClick={() => setMissedOpen((open) => !open)}
        >
          Missed doses
        </button>
        {missedOpen ? (
          missed.length ? (
            <ul>
              {missed.map((row) => (
                <li key={row.id}>
                  <img src={row.image || "/meds/pack-navy.svg"} alt="" />
                  <span>
                    <strong>{row.brand}</strong>
                    <em>{row.salt || "Salt not listed"}</em>
                    <small>{[row.slot, row.time, doseDayLabel(row.day)].filter(Boolean).join(" · ")}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No missed doses.</p>
          )
        ) : null}
      </section>
    </section>
  );
}
