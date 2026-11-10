import { useEffect, useState } from "react";
import {
  fetchPartnerNotifications,
  markPartnerNotificationsRead,
  partnerSession,
} from "./partnerApi";

export default function PartnerCancelNotice() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (!partnerSession().token) return;
      try {
        const data = await fetchPartnerNotifications();
        const rows = (data.notifications || []).filter(
          (row) => row.type === "booking_cancelled" && !row.readAt
        );
        if (!cancelled) setNotices(rows);
      } catch {
        /* ignore offline */
      }
    };
    tick();
    const timer = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!notices.length) return null;

  return (
    <aside className="partner-cancel-notice" role="status">
      <style>{styles}</style>
      {notices.map((row) => (
        <p key={row.id}>
          <strong>{row.title || "Booking cancelled"}</strong>
          {row.body ? ` · ${row.body}` : ""}
          <button
            type="button"
            onClick={async () => {
              setNotices((current) => current.filter((item) => item.id !== row.id));
              try {
                await markPartnerNotificationsRead([row.id]);
              } catch {
                /* the message stays unread and can be shown again */
              }
            }}
          >
            Dismiss
          </button>
        </p>
      ))}
    </aside>
  );
}

const styles = `
.partner-cancel-notice{margin:0 0 12px;display:grid;gap:8px}
.partner-cancel-notice p{margin:0;padding:10px 12px;border:1px solid #efd3d3;border-radius:10px;background:#fff6f6;color:#6d3030;display:flex;gap:10px;align-items:center;justify-content:space-between}
.partner-cancel-notice button{border:0;border-radius:8px;background:#8a5858;color:#fff;padding:6px 10px;cursor:pointer}
`;
