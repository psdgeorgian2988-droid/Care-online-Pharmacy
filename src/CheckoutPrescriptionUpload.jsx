import { useEffect, useRef, useState } from "react";
import {
  PRESCRIPTION_EVENT,
  fileToPrescriptionDraft,
  hasPrescriptionDraft,
  prescriptionDraftName,
  readPrescriptionDraft,
  writePrescriptionDraft,
} from "./prescriptionDraft";

export default function CheckoutPrescriptionUpload({
  idPrefix = "checkout",
  error = "",
}) {
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const [draft, setDraft] = useState(() => readPrescriptionDraft());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const refresh = () => setDraft(readPrescriptionDraft());
    window.addEventListener(PRESCRIPTION_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PRESCRIPTION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setStatus("");
    try {
      const next = await fileToPrescriptionDraft(file);
      writePrescriptionDraft(next);
      setDraft(next);
    } catch (err) {
      setStatus(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const ready = hasPrescriptionDraft() || Boolean(draft?.fileName);
  const name = draft?.fileName || prescriptionDraftName();

  return (
    <div className={`checkout-rx${ready ? " is-ready" : ""}`}>
      <label htmlFor={`${idPrefix}-rx-file`}>Prescription</label>
      {ready ? (
        <p>Using uploaded prescription: {name}</p>
      ) : (
        <p className="checkout-rx-ask">
          Upload a photo or PDF of the prescription to complete this order.
        </p>
      )}
      <div className="checkout-rx-actions">
        <input
          ref={cameraRef}
          id={`${idPrefix}-rx-camera`}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
        />
        <input
          ref={fileRef}
          id={`${idPrefix}-rx-file`}
          type="file"
          accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
          onChange={onFile}
        />
        <button
          type="button"
          className="checkout-rx-btn"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
        >
          {busy ? "Uploading…" : ready ? "Retake photo" : "Take photo"}
        </button>
        <button
          type="button"
          className="checkout-rx-btn is-quiet"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Uploading…" : ready ? "Replace file" : "Upload Rx"}
        </button>
      </div>
      {status ? <small className="checkout-rx-error">{status}</small> : null}
      {error ? <small className="checkout-rx-error">{error}</small> : null}
    </div>
  );
}
