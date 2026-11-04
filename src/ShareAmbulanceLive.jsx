import { useState } from "react";
import {
  ambulanceShareText,
  ambulanceTrackUrl,
  bookedFromDifferentPlace,
  whatsappShareHref,
} from "./ambulanceShare.js";

function digits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

export default function ShareAmbulanceLive({ order }) {
  const differentPlace = bookedFromDifferentPlace(order);
  const [dear, setDear] = useState(() => digits(order?.dearOneMobile));
  const [family, setFamily] = useState("");
  const [note, setNote] = useState("");
  const text = ambulanceShareText(order);

  const send = (mobile, label) => {
    const next = digits(mobile);
    if (next && !/^[6-9]\d{9}$/.test(next)) {
      setNote(`Enter a 10-digit mobile for ${label}.`);
      return;
    }
    setNote("");
    window.open(whatsappShareHref(next, text), "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    const url = ambulanceTrackUrl(order);
    try {
      await navigator.clipboard.writeText(url);
      setNote("Live location link copied.");
    } catch {
      setNote(url);
    }
  };

  return (
    <section className="amb-share-live">
      <h3>Share live ambulance location</h3>
      {differentPlace ? (
        <div>
          <p>This booking was made from a different place. Send the ambulance’s live location to your dear one.</p>
          <label htmlFor="share-dear">Dear one’s mobile</label>
          <div className="amb-share-row">
            <input
              id="share-dear"
              value={dear}
              onChange={(event) => setDear(digits(event.target.value))}
              placeholder="10-digit mobile"
              inputMode="numeric"
              maxLength={10}
            />
            <button type="button" onClick={() => send(dear, "your dear one")}>
              Share with dear one
            </button>
          </div>
        </div>
      ) : null}
      <div>
        <p>Share the same live location with another family member.</p>
        <label htmlFor="share-family">Family member’s mobile</label>
        <div className="amb-share-row">
          <input
            id="share-family"
            value={family}
            onChange={(event) => setFamily(digits(event.target.value))}
            placeholder="10-digit mobile"
            inputMode="numeric"
            maxLength={10}
          />
          <button type="button" onClick={() => send(family, "the family member")}>
            Share with family
          </button>
        </div>
      </div>
      <button type="button" className="amb-share-copy" onClick={copyLink}>
        Copy live location link
      </button>
      {note ? <small>{note}</small> : null}
      <style>{`
        .amb-share-live{margin-top:12px;padding:12px;border:1px solid #d7e2e9;border-radius:12px;background:#f7fbfd;display:flex;flex-direction:column;gap:10px}
        .amb-share-live h3{margin:0;font-size:15px;color:#143246}
        .amb-share-live p,.amb-share-live small{margin:0;color:#5d7180;font-size:13px;line-height:1.4}
        .amb-share-live label{display:block;margin:6px 0 4px;font-size:12px;font-weight:700;color:#34546b}
        .amb-share-row{display:flex;gap:8px;align-items:center}
        .amb-share-row input{flex:1;min-width:0;box-sizing:border-box;height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px}
        .amb-share-row button,.amb-share-copy{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:13px;font-weight:800;min-height:38px;padding:0 12px;cursor:pointer}
        .amb-share-copy{align-self:flex-start;background:#fff;color:#1a6b7a;border:1px solid #1a6b7a}
      `}</style>
    </section>
  );
}
