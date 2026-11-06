import { useState } from "react";
import { apiFetch } from "./apiBase.js";
import { guestMobile } from "./labCustomerActions.js";
import { listReportFiles, openReportFile, orderHasReport } from "./labPipeline.js";
import { goToHash } from "./hashRoute.js";
import { markCustomerEntryChosen } from "./authSession.js";
import { persistLocalOrder, trackHref } from "./orderTracking.js";
import { orderCurrentStatus, serviceKind } from "./orderStatus.js";

function orderNumber(order) {
  return String(order?.id || order?.bookingId || order?.requestId || "");
}

export default function GuestOrderLookup() {
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
      const res = await apiFetch(`/api/orders/mine?mobile=${encodeURIComponent(digits)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not search orders.");
      const orders = Array.isArray(data.orders) ? data.orders : [];
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

  return (
    <section className="guest-order-lookup" aria-label="Find an order">
      <style>{`
        .guest-order-lookup{display:grid;gap:10px;margin:16px 0 0;padding:14px;border:1px solid #d7e2e9;border-radius:14px;background:#fff}
        .guest-order-lookup h2{margin:0;font-size:16px;color:#143246}
        .guest-order-lookup p{margin:0;color:#5d7180;font-size:13px}
        .guest-order-lookup form{display:flex;flex-wrap:wrap;gap:8px;align-items:end}
        .guest-order-lookup label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34546b;flex:1;min-width:180px}
        .guest-order-lookup input{min-height:40px;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit}
        .guest-order-lookup button{min-height:40px;padding:8px 14px;border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-weight:800;cursor:pointer}
        .guest-order-lookup button.is-search{display:inline-flex;align-items:center;justify-content:center;width:44px;padding:0}
        .guest-order-lookup button.is-search svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
        .guest-order-lookup button.is-quiet{background:#fff;color:#1a6b7a;border:1px solid #c5e0e6}
        .guest-order-lookup .is-error{color:#9b2c2c}
        .guest-order-lookup article{display:grid;gap:4px;padding:10px;border:1px solid #e4ecef;border-radius:10px}
        .guest-order-lookup article strong{color:#1a6b7a}
        .guest-order-lookup .guest-order-actions{display:flex;gap:8px;flex-wrap:wrap}
      `}</style>
      <h2>Track by mobile</h2>
      <form onSubmit={search}>
        <label>
          Mobile number
          <input
            inputMode="numeric"
            value={mobile}
            maxLength={10}
            placeholder="10-digit mobile"
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </label>
        <button type="submit" className="is-search" aria-label={busy ? "Searching" : "Search"} disabled={busy}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16l5 5" />
          </svg>
        </button>
      </form>
      {error ? <p className="is-error">{error}</p> : null}
      {rows && rows.length === 0 ? <p>No order found for that mobile number.</p> : null}
      {rows?.map((order) => {
        const id = orderNumber(order);
        const kind = serviceKind(order);
        return (
          <article key={id || kind}>
            <strong>#{id}</strong>
            <span>
              {[kind, orderCurrentStatus(order), order.date || order.timeSlot].filter(Boolean).join(" · ")}
            </span>
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
    </section>
  );
}
