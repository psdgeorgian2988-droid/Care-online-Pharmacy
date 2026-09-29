import { useEffect, useState } from "react";
import { isoDateToday } from "./personFields";
import { useScheduledWebinars } from "./featureFlags";
import {
  formatWebinarDate,
  readSeenWebinarNotice,
  webinarNotice,
  writeSeenWebinarNotice,
} from "./webinars";

export default function WebinarNotice() {
  const webinars = useScheduledWebinars();
  const [seenId, setSeenId] = useState(readSeenWebinarNotice);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const notice = webinarNotice(webinars, seenId, isoDateToday(), nowMs);

  if (!notice) return null;

  return (
    <div className="webinar-notice" role="status">
      <style>{styles}</style>
      <p>
        <strong>Live webinar scheduled.</strong> {notice.title} ·{" "}
        {formatWebinarDate(notice.date)} · {notice.time}
      </p>
      <div className="webinar-notice-actions">
        <a href="#education?service=webinars">Book a seat</a>
        <button
          type="button"
          onClick={() => {
            writeSeenWebinarNotice(notice.id);
            setSeenId(notice.id);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

const styles = `
.webinar-notice{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:12px 14px;border-radius:12px;background:#0639b8;color:#fff}
.webinar-notice p{margin:0;flex:1 1 220px;font-size:14px;font-weight:600;line-height:1.4}
.webinar-notice strong{display:block;margin-bottom:2px;font-size:13px;letter-spacing:.3px;text-transform:uppercase}
.webinar-notice-actions{display:flex;flex-wrap:wrap;gap:8px}
.webinar-notice a,.webinar-notice button{appearance:none;min-height:36px;padding:6px 12px;border-radius:8px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;text-decoration:none}
.webinar-notice a{display:inline-flex;align-items:center;background:#fff;color:#0639b8}
.webinar-notice button{border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff}
`;
