import { useState } from "react";
import {
  appointmentSlotLabel,
  isAwaitingCustomerSlotConfirm,
  slotPartnerNoun,
} from "./orderConfirm";
import { replyToOfferedSlot } from "./customerNotifyApi";

export default function SlotOfferCard({ order, onResolved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isAwaitingCustomerSlotConfirm(order)) return null;

  const noun = slotPartnerNoun(order.kind || order.orderType || order.serviceType);
  const requested = [order.requestedDate, order.requestedTimeSlot]
    .filter(Boolean)
    .join(" · ");
  const offered = [order.offeredDate || order.date, order.offeredTimeSlot || order.timeSlot]
    .filter(Boolean)
    .join(" · ");

  const decide = async (decision) => {
    setBusy(true);
    setError("");
    try {
      const next = await replyToOfferedSlot(order, decision);
      onResolved?.(next);
    } catch (err) {
      setError(err.message || "Could not update the time slot.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="slot-offer-card" role="status">
      <p className="slot-offer-kicker">
        {noun === "psychologist" ? "Psychologist update" : "Imaging centre update"}
      </p>
      <h3>Your requested slot is not available</h3>
      {requested ? <p>You asked for {requested}.</p> : null}
      <p>
        The {noun} offered <strong>{offered || appointmentSlotLabel(order)}</strong>.
        Accept this slot to confirm your booking.
      </p>
      {error ? <p className="slot-offer-error">{error}</p> : null}
      <div className="slot-offer-actions">
        <button type="button" disabled={busy} onClick={() => decide("accept")}>
          {busy ? "Saving…" : "Accept this slot"}
        </button>
        <button
          type="button"
          className="is-ghost"
          disabled={busy}
          onClick={() => decide("decline")}
        >
          Ask for another slot
        </button>
      </div>
      <style>{`
        .slot-offer-card{margin:12px 0;padding:14px 16px;border:1px solid #d7b56d;border-radius:12px;background:#fff8e8;text-align:left}
        .slot-offer-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8a5a10}
        .slot-offer-card h3{margin:0 0 8px;font-size:16px;color:#143246}
        .slot-offer-card p{margin:0 0 8px;font-size:14px;color:#34546b;line-height:1.45}
        .slot-offer-error{color:#b64b4b;font-weight:700}
        .slot-offer-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
        .slot-offer-actions button{min-height:36px;padding:0 14px;border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
        .slot-offer-actions button.is-ghost{background:#fff;color:#1a6b7a;border:1px solid #1a6b7a}
        .slot-offer-actions button:disabled{opacity:.65;cursor:wait}
      `}</style>
    </aside>
  );
}
