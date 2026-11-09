import { useState } from "react";
import { apiFetch } from "./apiBase.js";
import { hasAccountSession, markCustomerEntryChosen, useLoginSession } from "./authSession.js";
import { guestMobile } from "./labCustomerActions.js";
import { listReportFiles, mergeOrderReportIntoStore, openReportFile, orderHasReport } from "./labPipeline.js";
import { pullRecordLibrary } from "./recordLibrary.js";
import { goToHash } from "./hashRoute.js";
import { persistLocalOrder, trackHref } from "./orderTracking.js";
import { orderTestName } from "./orderFullFields.js";
import { serviceKind } from "./orderStatus.js";

function orderNumber(order) {
  return String(order?.id || order?.bookingId || order?.requestId || "");
}

export default function GuestOrderLookup({ open = false }) {
  const session = useLoginSession();
  const [mobile, setMobile] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const search = async (event) => {
    event.preventDefault();
    const digits = guestMobile(mobile);
    if (!digits) {
      setRows(null);
      setError("Enter the 10-digit mobile used while ordering.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { orders } = await pullRecordLibrary(digits);
      orders.forEach((order) => {
        try {
          persistLocalOrder(order);
        } catch {
          /* keep the list even if this browser cannot store it */
        }
      });
      setRows(orders);
      setMobile("");
    } catch (err) {
      setRows(null);
      setError(err.message || "Could not search orders.");
    } finally {
      setBusy(false);
    }
  };

  const openOrder = (order) => {
    const id = orderNumber(order);
    if (!id) return;
    markCustomerEntryChosen();
    goToHash(trackHref(id));
  };

  const openReport = async (order, file) => {
    const id = orderNumber(order);
    setError("");
    try {
      const res = await apiFetch(`/api/orders/lookup?id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.order) throw new Error(data.error || "Report is not ready.");
      mergeOrderReportIntoStore(data.order);
      const match = file
        ? listReportFiles(data.order).find((row) => row.fileName === file.fileName) || file
        : data.order;
      if (!openReportFile(match)) {
        openOrder(data.order);
      }
    } catch (err) {
      setError(err.message || "Could not open the report.");
    }
  };

  if (!open || hasAccountSession(session)) return null;

  return (
    <section className="guest-report-dock" aria-label="Search report">
      <style>{`
        .guest-report-dock{position:fixed;z-index:46;left:50%;right:auto;bottom:calc(var(--app-footer-h, 44px) + 72px + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);width:100%;max-width:var(--app-frame, 430px);box-sizing:border-box;display:grid;gap:8px;padding:8px 72px 8px 10px;border-top:1px solid #c5ddd8;background:rgba(255,255,255,.98);box-shadow:0 -8px 18px rgba(20,50,70,.08)}
        .guest-report-dock form{display:flex;align-items:center;gap:8px}
        .guest-report-dock label{display:grid;gap:2px;flex:1;min-width:0;font-size:11px;font-weight:800;color:#34546b}
        .guest-report-dock input{min-height:36px;width:100%;box-sizing:border-box;padding:6px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px}
        .guest-report-dock button{min-height:36px;padding:8px 12px;border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
        .guest-report-dock button.is-search{display:inline-flex;align-items:center;justify-content:center;width:40px;padding:0;flex:0 0 40px}
        .guest-report-dock button.is-search svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
        .guest-report-dock button.is-quiet{background:#fff;color:#1a6b7a;border:1px solid #c5e0e6}
        .guest-report-dock p{margin:0;color:#5d7180;font-size:12px}
        .guest-report-dock .is-error{color:#9b2c2c}
        .guest-report-pop{position:absolute;left:0;right:0;bottom:100%;display:grid;gap:6px;max-height:168px;overflow:auto;padding:8px 10px;background:#fff;border:1px solid #e4ecef;border-bottom:0;box-shadow:0 -8px 18px rgba(20,50,70,.08)}
        .guest-report-dock .guest-report-results{display:grid;gap:6px}
        .guest-report-dock article{display:grid;gap:4px;padding:8px;border:1px solid #e4ecef;border-radius:10px;background:#f7fbfd}
        .guest-report-dock article strong{color:#1a6b7a;font-size:13px}
        .guest-report-dock article span{font-size:12px;color:#34546b}
        .guest-report-dock .guest-order-actions{display:flex;gap:8px;flex-wrap:wrap}
        .app:not(.app-customer) .guest-report-dock{left:0;right:0;width:100%;max-width:none;transform:none;bottom:calc(var(--shell-footer-h, 44px) + 72px + env(safe-area-inset-bottom, 0px))}
        @media (min-width:768px){
          .guest-report-dock{left:0;right:0;width:100%;max-width:none;transform:none}
        }
      `}</style>
      {rows || error ? (
        <div className="guest-report-pop">
          {error ? <p className="is-error">{error}</p> : null}
          {rows && rows.length === 0 ? <p>No order found for that mobile number.</p> : null}
          {rows?.length ? (
        <div className="guest-report-results">
          {rows.map((order) => {
            const id = orderNumber(order);
            const kind = serviceKind(order);
            return (
              <article key={id || kind}>
                <strong>{orderTestName(order)}</strong>
                <span>#{id}</span>
                <div className="guest-order-actions">
                  <button type="button" className="is-quiet" onClick={() => openOrder(order)}>
                    Track
                  </button>
                  {orderHasReport(order)
                    ? listReportFiles(order).map((file, index, files) => (
                        <button
                          key={`${file.fileName}-${index}`}
                          type="button"
                          className="is-quiet"
                          onClick={() => openReport(order, file)}
                        >
                          {files.length > 1 ? file.fileName || `Report ${index + 1}` : "Open report"}
                        </button>
                      ))
                    : null}
                </div>
              </article>
            );
          })}
        </div>
          ) : null}
        </div>
      ) : null}
      <form onSubmit={search}>
        <label>
          Search report
          <input
            inputMode="numeric"
            value={mobile}
            maxLength={10}
            placeholder="10-digit mobile"
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </label>
        <button type="submit" className="is-search" aria-label={busy ? "Searching" : "Search report"} disabled={busy}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16l5 5" />
          </svg>
        </button>
      </form>
    </section>
  );
}
