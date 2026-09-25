import { useState } from "react";
import {
  REFUND_STEPS,
  isRefundOrder,
  refundAmountOf,
  refundStatusLabel,
  refundTrackKey,
  refundUpdateFields,
} from "./refundTrack";
import { formatInr } from "./salesReport";
import { pharmacyReturnKey, pharmacyStatusLabel } from "./pharmacyTrack";

export default function RefundStatusPanel({
  order,
  audience = "customer",
  busy = false,
  onUpdate,
}) {
  const refundKey = refundTrackKey(order);
  const returnKey = pharmacyReturnKey(order);
  const [status, setStatus] = useState(refundKey || "pending");
  const [amount, setAmount] = useState(
    refundAmountOf(order) ? String(refundAmountOf(order)) : ""
  );
  const [note, setNote] = useState(order?.refundNote || "");
  if (!order) return null;
  const delivered =
    String(order.trackStatus || "").toLowerCase() === "done" || Boolean(order.trackCompleted);
  if (!isRefundOrder(order) && !(audience === "staff" && delivered)) return null;

  return (
    <div className="refund-status-panel">
      <style>{styles}</style>
      <p className="refund-status-kicker">Refund</p>
      {returnKey ? (
        <p>Return: {pharmacyStatusLabel(returnKey)}</p>
      ) : null}
      <p className="refund-status-now">
        {refundKey
          ? refundStatusLabel(refundKey, order)
          : returnKey
            ? "Refund not started"
            : "No refund yet"}
      </p>
      {order.refundNote ? <p>Note: {order.refundNote}</p> : null}
      {refundKey === "refunded" && refundAmountOf(order) ? (
        <p>Paid back {formatInr(refundAmountOf(order))}.</p>
      ) : null}
      {audience === "staff" && onUpdate ? (
        <div className="refund-status-tools">
          <label>
            Refund status
            <select value={status} disabled={busy} onChange={(event) => setStatus(event.target.value)}>
              {REFUND_STEPS.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Refund amount
            <input
              type="number"
              min={0}
              value={amount}
              disabled={busy}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label>
            Note
            <input
              value={note}
              maxLength={240}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
              placeholder="UPI / bank / COD reversal"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onUpdate(
                order,
                refundUpdateFields(status, {
                  amount: Number(amount),
                  note,
                })
              )
            }
          >
            Update refund
          </button>
        </div>
      ) : (
        <p>
          {refundKey
            ? "This status updates here as soon as admin changes the refund."
            : "Admin will start the refund after the pharmacy receives the return."}
        </p>
      )}
    </div>
  );
}

const styles = `
.refund-status-panel{margin:10px 0;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd;display:grid;gap:6px}
.refund-status-kicker{margin:0;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.refund-status-panel p{margin:0;font-size:12px;line-height:1.4;color:#34546b}
.refund-status-now{font-weight:800;color:#143246 !important}
.refund-status-tools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:end}
.refund-status-tools label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:#34546b}
.refund-status-tools select,.refund-status-tools input{min-height:34px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:6px;font:inherit;font-size:13px;background:#fff}
.refund-status-tools button{border:0;border-radius:6px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;min-height:34px;cursor:pointer}
@media (max-width:800px){.refund-status-tools{grid-template-columns:1fr}}
`;
