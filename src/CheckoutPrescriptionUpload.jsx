import { useEffect, useRef, useState } from "react";
import {
  PRESCRIPTION_EVENT,
  fileToPrescriptionDraft,
  hasPrescriptionDraft,
  prescriptionDraftName,
  readPrescriptionDraft,
  writePrescriptionDraft,
} from "./prescriptionDraft";
import { clearPrescriptionParse } from "./prescriptionAi";

export default function CheckoutPrescriptionUpload({
  idPrefix = "checkout",
  error = "",
  compact = false,
  required = false,
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
      clearPrescriptionParse();
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

  if (compact) {
    return (
      <div className="checkout-rx-tab-row" aria-label="Prescription upload">
        <input
          ref={cameraRef}
          id={`${idPrefix}-rx-camera`}
          className="checkout-rx-tab-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
        />
        <input
          ref={fileRef}
          id={`${idPrefix}-rx-file`}
          className="checkout-rx-tab-input"
          type="file"
          accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
          onChange={onFile}
        />
        <button
          type="button"
          className="home-rx-tab is-on"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Uploading…" : ready ? "Uploaded Rx" : "Upload Rx"}
        </button>
        {ready ? (
          <>
            <span className="checkout-rx-tab-name" title={name}>{name}</span>
            <button
              type="button"
              className="home-rx-tab"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Replace
            </button>
          </>
        ) : required ? (
          <span className="checkout-rx-tab-hint">Required for this order</span>
        ) : null}
        {status || error ? (
          <small className="checkout-rx-error">{status || error}</small>
        ) : null}
      </div>
    );
  }

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
