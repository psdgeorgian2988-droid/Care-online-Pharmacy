import { useEffect, useState } from "react";
import { partnerTraffic } from "./partnerQueue";
import {
  CARE_PHONE_DISPLAY,
  CARE_PHONE_TEL,
  CARE_WHATSAPP_URL,
} from "./careChat";

export function useBusyOverlay(submitting, kind, urgent = false) {
  const [traffic, setTraffic] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!submitting) {
      setTraffic(null);
      setVisible(false);
      return undefined;
    }
    const snap = partnerTraffic(kind);
    setTraffic(snap);
    const delay = urgent ? 1400 : snap.busy ? 80 : 500;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [submitting, kind, urgent]);

  return visible ? traffic : null;
}

export function PatienceNote({ kind, shown }) {
  if (!shown) return null;
  const service = kind ? String(kind) : "this";
  return (
    <>
      <style>{noteStyles}</style>
      <aside className="patience-note" role="status">
        <p className="patience-kicker">Partners were busy</p>
        <p>
          Sorry for the wait. {serviceLabel(service)} had high traffic, so the
          booking took a moment. Thank you for keeping patience — your request
          is with MediHome now.
        </p>
      </aside>
    </>
  );
}

export default function BusyWait({ kind, traffic }) {
  const label = traffic?.label || serviceLabel(kind);
  const busy = Boolean(traffic?.busy);
  return (
    <>
      <style>{styles}</style>
      <div className="busy-wait" role="alertdialog" aria-labelledby="busy-wait-title">
        <div className="busy-wait-card">
          <div className="busy-wait-lane" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="busy-wait-kicker">
            {busy ? "High partner traffic" : "Just a moment"}
          </p>
          <h2 id="busy-wait-title">
            {busy
              ? `Sorry, ${label.toLowerCase()} partners are busy`
              : "Sorry, this is taking a little longer"}
          </h2>
          <p>
            Please keep patience. We are lining up the next available partner
            so your booking is done with care, not in a rush.
          </p>
          <p className="busy-wait-soft">
            You stay in line. We will confirm as soon as a partner is free.
          </p>
          <div className="busy-wait-actions">
            <a href={`tel:${CARE_PHONE_TEL}`}>Call {CARE_PHONE_DISPLAY}</a>
            <a href={CARE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              WhatsApp care
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function serviceLabel(kind) {
  switch (kind) {
    case "lab":
      return "Lab";
    case "radiology":
      return "Radiology";
    case "homecare":
      return "Home Care";
    case "stepdown":
      return "Step-down";
    case "ambulance":
      return "Ambulance";
    default:
      return "Medicine delivery";
  }
}

const styles = `
.busy-wait{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,28,40,.42);backdrop-filter:blur(4px)}
.busy-wait-card{width:min(420px,100%);padding:28px 22px 22px;border-radius:20px;background:linear-gradient(180deg,#fff 0%,#f3fbf8 100%);border:1px solid #d7e6ee;text-align:center;color:#143246;box-shadow:0 24px 50px rgba(10,28,40,.25)}
.busy-wait-lane{display:flex;justify-content:center;gap:8px;margin-bottom:14px}
.busy-wait-lane span{width:10px;height:10px;border-radius:50%;background:#1a6b7a;animation:busyBounce 1.1s ease-in-out infinite}
.busy-wait-lane span:nth-child(2){animation-delay:.15s}
.busy-wait-lane span:nth-child(3){animation-delay:.3s}
.busy-wait-kicker{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#c44b4b}
.busy-wait-card h2{margin:0 0 10px;font-size:22px;line-height:1.25}
.busy-wait-card p{margin:0 auto 8px;max-width:36ch;color:#34546b;font-size:14px;line-height:1.5}
.busy-wait-soft{color:#1a6b7a;font-weight:600}
.busy-wait-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:14px}
.busy-wait-actions a{border-radius:999px;padding:7px 12px;text-decoration:none;font-size:12px;font-weight:800;background:#fff;color:#1a6b7a;border:1px solid #cfe0e8}
@keyframes busyBounce{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-6px);opacity:1}}
`;

const noteStyles = `
.patience-note{margin:0 0 12px;padding:12px 14px;border-radius:12px;background:#fff7e8;border:1px solid #f0d7a4;text-align:left;color:#143246}
.patience-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#b36b00}
.patience-note p{margin:0;font-size:13px;line-height:1.45;color:#5a4630}
`;
