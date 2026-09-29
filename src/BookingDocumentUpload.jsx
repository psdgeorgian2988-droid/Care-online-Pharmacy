import { useRef, useState } from "react";
import { fileToPrescriptionDraft } from "./prescriptionDraft";

export default function BookingDocumentUpload({
  idPrefix,
  label,
  ask,
  readyText = "Uploaded",
  uploadLabel = "Upload file",
  draft = null,
  onChange,
  error = "",
}) {
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const ready = Boolean(draft?.fileName || draft?.fileData);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setStatus("");
    try {
      onChange?.(await fileToPrescriptionDraft(file));
    } catch (err) {
      setStatus(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`checkout-rx${ready ? " is-ready" : ""}`}>
      <label htmlFor={`${idPrefix}-file`}>
        {label} <em>*</em>
      </label>
      {ready ? (
        <p>
          {readyText}: {draft.fileName}
        </p>
      ) : (
        <p className="checkout-rx-ask">{ask}</p>
      )}
      <div className="checkout-rx-actions">
        <input
          ref={cameraRef}
          id={`${idPrefix}-camera`}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
        />
        <input
          ref={fileRef}
          id={`${idPrefix}-file`}
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
          {busy ? "Uploading…" : ready ? "Replace file" : uploadLabel}
        </button>
      </div>
      {status ? <small className="checkout-rx-error">{status}</small> : null}
      {error ? <small className="checkout-rx-error">{error}</small> : null}
    </div>
  );
}
