import { useEffect, useState } from "react";
import { fetchSlotCapacity, saveSlotCapacity } from "./partnerApi";

export default function SlotCapacityControl() {
  const [capacity, setCapacity] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetchSlotCapacity()
      .then((data) => {
        if (!live) return;
        const next = String(data.capacity || "");
        setCapacity(next);
        setSaved(next);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await saveSlotCapacity(Number(capacity));
      const next = String(data.capacity || "");
      setCapacity(next);
      setSaved(next);
    } catch (err) {
      setError(err.message || "Could not save slot size.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="partner-slot-capacity" onSubmit={save}>
      <style>{`
        .partner-slot-capacity{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:0 0 12px;padding:12px;border:1px solid #d7e2e9;border-radius:12px;background:#f7fbfb}
        .partner-slot-capacity label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34546b}
        .partner-slot-capacity input{width:88px;min-height:40px;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit}
        .partner-slot-capacity button{min-height:40px;padding:8px 14px;border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-weight:800;cursor:pointer}
        .partner-slot-capacity p{flex-basis:100%;margin:0;color:#5d7180;font-size:13px}
      `}</style>
      <label>
        Bookings per slot
        <input
          inputMode="numeric"
          aria-label="Bookings per slot"
          value={capacity}
          onChange={(event) => setCapacity(event.target.value.replace(/\D/g, "").slice(0, 2))}
        />
      </label>
      <button type="submit" disabled={busy || !capacity || capacity === saved}>
        Save
      </button>
      <p>Each time slot accepts this many bookings, from 1 to 20.</p>
      {error ? <small className="admin-error">{error}</small> : null}
    </form>
  );
}
