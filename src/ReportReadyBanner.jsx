import { useEffect, useRef, useState } from "react";
import { readUserProfile } from "./addressFields";
import { fetchCustomerNotifications } from "./customerNotifyApi";
import { mergeOrderReportIntoStore, openReportFile, reportFileForOrder } from "./labPipeline";
import { persistOrder, refreshOrderFromServer } from "./orderTracking";

function last10(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export default function ReportReadyBanner() {
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
          (row) => row.type === "report_ready" && !row.readAt
        );
        if (!unread || seenRef.current.has(unread.id)) return;
        seenRef.current.add(unread.id);
        const latest = await refreshOrderFromServer(unread.orderId);
        if (latest) {
          persistOrder(latest);
          mergeOrderReportIntoStore(latest);
        }
        if (!cancelled) setNotice({ ...unread, order: latest });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(unread.title || "Report ready", {
            body: unread.body || "Your diagnostic report is ready.",
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

  return (
    <aside className="report-ready-banner">
      <style>{styles}</style>
      <p>
        <strong>{notice.title || "Report ready"}</strong>
        {notice.body ? ` · ${notice.body}` : ""}
      </p>
      <div>
        <button
          type="button"
          onClick={() => {
            const file = reportFileForOrder(notice.order || { id: notice.orderId });
            if (!openReportFile(file || notice.order)) {
              globalThis.location.hash = "reports";
            }
          }}
        >
          Open report
        </button>
        <button type="button" onClick={() => setNotice(null)}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}

const styles = `
.report-ready-banner{margin:8px 12px;padding:10px 12px;border:1px solid #d2e8ef;border-radius:10px;background:#f3fbfc;display:grid;gap:6px}
.report-ready-banner p{margin:0;font-size:13px;line-height:1.4;color:#143246}
.report-ready-banner div{display:flex;flex-wrap:wrap;gap:8px}
.report-ready-banner a,.report-ready-banner button{border:0;background:none;padding:0;font:inherit;font-size:12px;font-weight:800;color:#1a6b7a;cursor:pointer;text-decoration:none}
`;
