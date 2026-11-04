import { useState } from "react";
import { apiFetch } from "./apiBase.js";
import { LAB_TIME_SLOTS } from "./appointmentSlot.js";
import { canCustomerChangeLabBooking, guestMobile } from "./labCustomerActions.js";
import { persistLocalOrder } from "./orderTracking.js";

export default function LabBookingChange({ order, onChanged }) {
  const [date, setDate] = useState(order?.date || "");
  const [timeSlot, setTimeSlot] = useState(order?.timeSlot || "");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!canCustomerChangeLabBooking(order)) return null;
  const id = String(order.id || order.bookingId || order.requestId || "");

  const send = async (action) => {
    const digits = guestMobile(mobile || order.mobile);
    if (!digits) {
      setError("Enter the mobile number used on this booking.");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await apiFetch("/api/orders/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, mobile: digits, action, date, timeSlot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update the booking.");
      if (data.order) persistLocalOrder(data.order);
      setNote(action === "cancel" ? "Booking cancelled." : "Slot updated.");
      onChanged?.(data.order);
    } catch (err) {
      setError(err.message || "Could not update the booking.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="lab-booking-change" aria-label="Change booking">
      <style>{`
        .lab-booking-change{display:grid;gap:8px;margin-top:12px;padding:12px;border:1px solid #d7e2e9;border-radius:12px;background:#fff}
        .lab-booking-change p{margin:0;font-size:13px;color:#34546b}
        .lab-booking-change label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34546b}
        .lab-booking-change input,.lab-booking-change select{min-height:38px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:8px;font:inherit}
        .lab-booking-change .lab-change-actions{display:flex;gap:8px;flex-wrap:wrap}
        .lab-booking-change button{min-height:38px;padding:8px 12px;border-radius:8px;border:1px solid #1a6b7a;background:#1a6b7a;color:#fff;font:inherit;font-weight:800;cursor:pointer}
        .lab-booking-change button.is-quiet{background:#fff;color:#9b2c2c;border-color:#e7c1c1}
        .lab-booking-change .is-error{color:#9b2c2c}
      `}</style>
      <p>Change or cancel this booking before the sample is collected.</p>
      <label>
        Mobile on the booking
        <input
          inputMode="numeric"
          value={mobile}
          maxLength={10}
          placeholder="10-digit mobile"
          onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </label>
      <label>
        New date
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label>
        New slot
        <select value={timeSlot} onChange={(event) => setTimeSlot(event.target.value)}>
          <option value="">Select a slot</option>
          {LAB_TIME_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </label>
      <div className="lab-change-actions">
        <button type="button" disabled={busy} onClick={() => send("reschedule")}>
          Update slot
        </button>
        <button type="button" className="is-quiet" disabled={busy} onClick={() => send("cancel")}>
          Cancel booking
        </button>
      </div>
      {error ? <p className="is-error">{error}</p> : null}
      {note ? <p>{note}</p> : null}
    </section>
  );
}
