import { useEffect, useRef, useState } from "react";
import { goToHash } from "./hashRoute";
import { clearPrescriptionParse } from "./prescriptionAi";
import {
  clearPrescriptionDraft,
  fileToPrescriptionDraft,
  PRESCRIPTION_EVENT,
  readPrescriptionDraft,
  writePrescriptionDraft,
} from "./prescriptionDraft";

export default function HomePrescriptionUpload() {
  const inputRef = useRef(null);
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
      goToHash("#prescription");
    } catch (err) {
      setStatus(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="home-rx-upload" aria-label="Upload prescription">
      <div>
        <p className="home-rx-kicker">Prescription</p>
        <strong>Upload prescription</strong>
        <span>Image (JPG, PNG, WEBP) or PDF</span>
        {draft?.fileName ? (
          <em className="home-rx-file">
            Saved: {draft.fileName}
            <button
              type="button"
              className="home-rx-remove"
              aria-label="Remove uploaded prescription"
              title="Remove prescription"
              onClick={() => {
                clearPrescriptionParse();
                clearPrescriptionDraft();
              }}
            >
              ×
            </button>
          </em>
        ) : null}
        {status ? <small className="home-rx-error">{status}</small> : null}
      </div>
      <div className="home-rx-actions">
        <input
          ref={inputRef}
          id="homeRxFile"
          type="file"
          accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
          onChange={onFile}
        />
        <button
          type="button"
          className="app-home-cta"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : draft?.fileName ? "Replace file" : "Upload Rx"}
        </button>
        {draft?.fileName ? (
          <a className="home-rx-view" href="#prescription">
            View
          </a>
        ) : null}
      </div>
    </section>
  );
}
