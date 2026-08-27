import { useEffect, useState } from "react";
import { partnerTraffic, refreshLiveTraffic } from "./partnerQueue";
import {
  CARE_PHONE_DISPLAY,
  CARE_PHONE_TEL,
  CARE_WHATSAPP_URL,
} from "./careChat";

const ROTATING = [
  "Finding the next free partner…",
  "Your place in line is held.",
  "Thank you for keeping patience.",
];

export function useBusyOverlay(submitting, kind, urgent = false) {
  const [traffic, setTraffic] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!submitting) {
      setTraffic(null);
      setVisible(false);
      return undefined;
    }
    let cancelled = false;
    let timer;
    (async () => {
      await refreshLiveTraffic();
      if (cancelled) return;
      const snap = partnerTraffic(kind);
      setTraffic(snap);
      const delay = urgent ? 1400 : snap.busy ? 0 : 480;
      timer = setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, delay);
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [submitting, kind, urgent]);

  return visible ? traffic : null;
}

export function PatienceNote({ kind, shown }) {
  if (!shown) return null;
  return (
    <>
      <style>{noteStyles}</style>
      <aside className="patience-note" role="status">
        <p className="patience-kicker">Sorry for the wait</p>
        <p>
          {serviceLabel(kind)} partners were busy, so this booking was not
          instant. Thank you for keeping patience — your request is with
          MediHome now.
        </p>
      </aside>
    </>
  );
}

export default function BusyWait({ kind, traffic }) {
  const [line, setLine] = useState(0);
  const label = traffic?.label || serviceLabel(kind);
  const busy = Boolean(traffic?.busy);
  const ahead = Math.max(1, Number(traffic?.openCount || 1));

  useEffect(() => {
    const timer = setInterval(() => setLine((n) => (n + 1) % ROTATING.length), 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="busy-wait" role="alertdialog" aria-labelledby="busy-wait-title" aria-live="polite">
        <div className="busy-wait-card">
          <div className="busy-pulse" aria-hidden="true">
            <span className="busy-ring" />
            <span className="busy-ring busy-ring-late" />
            <span className="busy-heart">♡</span>
          </div>
          <p className="busy-wait-kicker">
            {busy ? "High partner traffic" : "Just a moment"}
          </p>
          <h2 id="busy-wait-title">Sorry, please keep patience</h2>
          <p>
            {busy
              ? `${label} partners are with other patients right now. We held your place instead of rushing the booking.`
              : "This is taking a little longer than usual. Please keep patience while we finish your booking with care."}
          </p>
          <div className="busy-queue" aria-hidden="true">
            <span className="busy-you">You</span>
            <i />
            {Array.from({ length: Math.min(4, ahead) }, (_, i) => (
              <b key={i} style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
            <em>Next partner</em>
          </div>
          <p className="busy-wait-soft">{ROTATING[line]}</p>
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
      return "Laboratory Test";
    case "radiology":
      return "Radiology & Imaging";
    case "homecare":
      return "Home Care";
    case "vaccination":
      return "Vaccination";
    case "psychologist":
      return "Psychologist Consultation";
    case "stepdown":
      return "Step-Down Care";
    case "ambulance":
      return "Ambulance";
    default:
      return "Medicine delivery";
  }
}

const styles = `
.busy-wait{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,32,42,.48);backdrop-filter:blur(6px)}
.busy-wait-card{width:min(440px,100%);padding:26px 22px 20px;border-radius:24px;background:
  radial-gradient(120% 80% at 50% -10%,#e7f7f3 0%,#fff 42%),#fff;border:1px solid #cfe4dc;text-align:center;color:#143246;box-shadow:0 28px 60px rgba(10,28,40,.28)}
.busy-pulse{position:relative;width:72px;height:72px;margin:0 auto 12px}
.busy-heart{position:absolute;inset:0;display:grid;place-items:center;font-size:28px;color:#c44b4b;animation:busyBeat 1.2s ease-in-out infinite}
.busy-ring{position:absolute;inset:8px;border-radius:50%;border:2px solid rgba(196,75,75,.35);animation:busyRipple 1.8s ease-out infinite}
.busy-ring-late{animation-delay:.6s}
.busy-wait-kicker{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#c44b4b}
.busy-wait-card h2{margin:0 0 10px;font-size:24px;line-height:1.2}
.busy-wait-card p{margin:0 auto 8px;max-width:38ch;color:#34546b;font-size:14px;line-height:1.55}
.busy-queue{display:flex;align-items:center;justify-content:center;gap:7px;margin:14px 0 10px}
.busy-you{border-radius:999px;padding:4px 9px;background:#1a6b7a;color:#fff;font-size:11px;font-weight:800}
.busy-queue i{width:22px;height:2px;background:linear-gradient(90deg,#1a6b7a,#cfe4dc);border-radius:2px}
.busy-queue b{width:9px;height:9px;border-radius:50%;background:#f0b429;opacity:.45;animation:busyBounce 1.1s ease-in-out infinite}
.busy-queue em{font-style:normal;font-size:11px;font-weight:800;color:#1a6b7a}
.busy-wait-soft{color:#1a6b7a;font-weight:700;min-height:1.4em}
.busy-wait-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}
.busy-wait-actions a{border-radius:999px;padding:7px 12px;text-decoration:none;font-size:12px;font-weight:800;background:#fff;color:#1a6b7a;border:1px solid #cfe0e8}
@keyframes busyBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes busyRipple{0%{transform:scale(.7);opacity:.7}100%{transform:scale(1.45);opacity:0}}
@keyframes busyBounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
`;

const noteStyles = `
.patience-note{margin:0 0 12px;padding:12px 14px;border-radius:12px;background:#fff7e8;border:1px solid #f0d7a4;text-align:left;color:#143246}
.patience-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#b36b00}
.patience-note p{margin:0;font-size:13px;line-height:1.45;color:#5a4630}
`;
