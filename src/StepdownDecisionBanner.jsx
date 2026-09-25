import { useEffect, useRef, useState } from "react";
import { readUserProfile } from "./addressFields";
import { fetchCustomerNotifications } from "./customerNotifyApi";
import { persistOrder, refreshOrderFromServer } from "./orderTracking";
import { orderCurrentStatus } from "./orderStatus";

function last10(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export default function StepdownDecisionBanner() {
  const [notice, setNotice] = useState(null);
  const seenRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const mobile = last10(readUserProfile()?.mobile);
      if (mobile.length !== 10) return;
      try {
        const data = await fetchCustomerNotifications(mobile);
        const unread = (data.notifications || []).find(
          (row) => String(row.type || "").startsWith("stepdown_") && !row.readAt
        );
        if (!unread || seenRef.current.has(unread.id)) return;
        seenRef.current.add(unread.id);
        const latest = await refreshOrderFromServer(unread.orderId);
        if (latest) persistOrder(latest);
        if (!cancelled) setNotice({ ...unread, order: latest });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(unread.title || "Step-down booking update", {
            body: unread.body || orderCurrentStatus(latest) || "Your booking status has changed.",
          });
        }
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
  const status = orderCurrentStatus(notice.order);

  return (
    <aside className="sd-decision-banner">
      <style>{styles}</style>
      <p>
        <strong>{notice.title || status}</strong>
        {notice.body ? ` · ${notice.body}` : status ? ` · ${status}` : ""}
      </p>
      <div>
        <a href="#myorders">Open My Orders</a>
        <button type="button" onClick={() => setNotice(null)}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}

const styles = `
.sd-decision-banner{margin:8px 12px;padding:10px 12px;border:1px solid #d2e8ef;border-radius:10px;background:#f3fbfc;display:grid;gap:6px}
.sd-decision-banner p{margin:0;font-size:13px;line-height:1.4;color:#143246}
.sd-decision-banner div{display:flex;flex-wrap:wrap;gap:8px}
.sd-decision-banner a,.sd-decision-banner button{border:0;background:none;padding:0;font:inherit;font-size:12px;font-weight:800;color:#1a6b7a;cursor:pointer;text-decoration:none}
`;
