import { useEffect, useState } from "react";
import { DOSE_ALARM_EVENT } from "./doseAlarm.js";
import { readDoseSchedule, recordDoseAnswer, writeDoseSchedule } from "./doseReminders.js";

export default function DoseAlarmScreen() {
  const [items, setItems] = useState([]);
  const [asking, setAsking] = useState(false);
  const medicineCount = items.reduce((count, item) => count + (item.medicines?.length || 0), 0);
  const question = medicineCount > 1 ? "Have you taken these medicines?" : "Have you taken this medicine?";

  useEffect(() => {
    const open = (event) => {
      const item = event.detail;
      if (!item?.medicines?.length) return;
      setAsking(false);
      setItems((current) => (current.some((row) => row.stamp === item.stamp) ? current : [...current, item]));
    };
    window.addEventListener(DOSE_ALARM_EVENT, open);
    return () => window.removeEventListener(DOSE_ALARM_EVENT, open);
  }, []);

  const answer = (taken) => {
    writeDoseSchedule(recordDoseAnswer(readDoseSchedule(), items, taken));
    setItems([]);
    setAsking(false);
  };

  if (!items.length) return null;

  return (
    <div className="dose-alarm-screen" role="dialog" aria-modal="true" aria-label="Medicine reminder">
      <style>{`
        .dose-alarm-screen{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:16px;background:rgba(20,50,70,.55)}
        .dose-alarm-card{width:min(420px,100%);max-height:min(82vh,640px);overflow:auto;display:grid;gap:12px;padding:16px;border-radius:16px;background:#fff;box-shadow:0 16px 40px rgba(20,50,70,.28)}
        .dose-alarm-card h2{margin:0;font-size:18px;color:#143246}
        .dose-alarm-card h3{margin:0;font-size:14px;color:#1a6b7a}
        .dose-alarm-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}
        .dose-alarm-list li{display:flex;gap:10px;align-items:center;padding:8px;border:1px solid #e4ecef;border-radius:12px;background:#f7fbfb}
        .dose-alarm-list img{width:84px;height:56px;object-fit:contain;flex:0 0 84px;border-radius:8px;background:#fff}
        .dose-alarm-list strong{display:block;color:#143246;font-size:16px}
        .dose-alarm-list em{display:block;margin-top:2px;font-style:normal;color:#5d7180;font-size:13px}
        .dose-alarm-actions{display:flex;justify-content:flex-end;gap:8px}
        .dose-alarm-card button{min-height:36px;padding:8px 16px;border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-weight:800;cursor:pointer}
        .dose-alarm-card .dose-alarm-no{background:#fff;color:#1a6b7a;border:1px solid #1a6b7a}
        .dose-alarm-ask{margin:0;color:#143246;font-size:15px;font-weight:800}
      `}</style>
      <div className="dose-alarm-card">
        <h2>{asking ? question : "Medicine reminder"}</h2>
        {items.map((item) => (
          <section key={item.stamp}>
            <h3>{item.slot?.plain}{item.time ? ` · ${item.time}` : ""}</h3>
            <ul className="dose-alarm-list">
              {item.medicines.map((med) => (
                <li key={med.id || med.name}>
                  <img src={med.image || "/meds/pack-navy.svg"} alt="" />
                  <span>
                    <strong>{med.brand || med.name}</strong>
                    <em>{med.salt || "Salt not listed"}</em>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {asking ? (
          <div className="dose-alarm-actions">
            <button type="button" className="dose-alarm-no" onClick={() => answer(false)}>No</button>
            <button type="button" onClick={() => answer(true)}>Yes</button>
          </div>
        ) : (
          <div className="dose-alarm-actions">
            <button type="button" onClick={() => setAsking(true)}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
