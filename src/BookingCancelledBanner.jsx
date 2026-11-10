import { useEffect, useState } from "react";
import { readUserProfile } from "./addressFields";
import {
  fetchCustomerNotifications,
  markCustomerNotificationsRead,
} from "./customerNotifyApi";

function last10(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export default function BookingCancelledBanner() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const mobile = last10(readUserProfile()?.mobile);
      if (mobile.length !== 10) return;
      try {
        const data = await fetchCustomerNotifications(mobile);
        const unread = (data.notifications || []).find(
          (row) => row.type === "booking_cancelled" && !row.readAt
        );
        if (!cancelled) setNotice(unread || null);
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

  if (!notice) return null;

  return (
    <aside className="booking-cancelled-banner" role="status">
      <style>{styles}</style>
      <p>
        <strong>{notice.title || "Booking cancelled"}</strong>
        {notice.body ? ` · ${notice.body}` : ""}
      </p>
      <button
        type="button"
        onClick={async () => {
          const current = notice;
          setNotice(null);
          try {
            await markCustomerNotificationsRead(current.mobile, [current.id]);
          } catch {
            /* the message stays unread and can be shown again */
          }
        }}
      >
        Dismiss
      </button>
    </aside>
  );
}

const styles = `
.booking-cancelled-banner{margin:8px 12px;padding:10px 12px;border:1px solid #efd3d3;border-radius:10px;background:#fff6f6;display:flex;gap:10px;align-items:center;justify-content:space-between}
.booking-cancelled-banner p{margin:0;color:#6d3030}
.booking-cancelled-banner button{border:0;border-radius:8px;background:#8a5858;color:#fff;padding:6px 10px;cursor:pointer}
`;
