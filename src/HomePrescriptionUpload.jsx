import { useEffect, useRef, useState } from "react";
import { goToHash } from "./hashRoute";
import HeaderCart from "./HeaderCart.jsx";
import { clearPrescriptionParse } from "./prescriptionAi";
import { normalizeRxDetect } from "./rxDetect.js";
import {
  clearPrescriptionDraft,
  fileToPrescriptionDraft,
  PRESCRIPTION_EVENT,
  readPrescriptionDraft,
  writePrescriptionDraft,
} from "./prescriptionDraft";

export default function HomePrescriptionUpload({
  showCart = true,
  idPrefix = "home",
  detect = "",
  disabled = false,
  label = "Upload Rx",
  inline = false,
  formOnly = false,
} = {}) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
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
    if (disabled) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setStatus("");
    try {
      const next = await fileToPrescriptionDraft(file);
      clearPrescriptionParse();
      writePrescriptionDraft({ ...next, detect: normalizeRxDetect(detect) });
      goToHash("#prescription");
    } catch (err) {
      setStatus(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  if (formOnly) {
    return (
      <form
        className="profile-report-form"
        aria-label="Upload prescription"
        onSubmit={(event) => event.preventDefault()}
      >
        {draft?.fileName ? (
          <p className="profile-report-note">
            Saved file: {draft.fileName}.{" "}
            <button type="button" onClick={() => goToHash("#prescription")}>
              Open prescription
            </button>
          </p>
        ) : (
          <p className="profile-report-note">Choose a photo or PDF of the prescription.</p>
        )}
        <label>
          Prescription file
          <input
            id={`${idPrefix}RxFile`}
            type="file"
            accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
            disabled={disabled || busy}
            onChange={onFile}
          />
        </label>
        {busy ? <p className="profile-report-note">Uploading…</p> : null}
        {status ? <small className="profile-error">{status}</small> : null}
      </form>
    );
  }

  return (
    <div className={`${inline ? "home-rx-inline" : "home-rx-cart-row"}${disabled ? " is-disabled" : ""}`}>
      <section
        className="home-rx-upload"
        aria-label={draft?.fileName ? "Uploaded prescription" : "Upload prescription"}
      >
        <input
          ref={cameraRef}
          id={`${idPrefix}RxCamera`}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled}
          onChange={onFile}
        />
        <input
          ref={fileRef}
          id={`${idPrefix}RxFile`}
          type="file"
          accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
          disabled={disabled}
          onChange={onFile}
        />
        {draft?.fileName ? (
          <>
            <a
              className="home-rx-tab is-on"
              href="#prescription"
              aria-disabled={disabled || undefined}
              onClick={(event) => {
                event.preventDefault();
                if (disabled) return;
                const mode = normalizeRxDetect(detect);
                const current = readPrescriptionDraft();
                if (current && mode && current.detect !== mode) {
                  clearPrescriptionParse();
                  writePrescriptionDraft({ ...current, detect: mode });
                }
                goToHash("#prescription");
              }}
            >
              Uploaded Rx
            </a>
            <button
              type="button"
              className="home-rx-tab"
              disabled={busy || disabled}
              onClick={() => {
                if (disabled) return;
                fileRef.current?.click();
              }}
            >
              {busy ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              className="home-rx-remove"
              aria-label="Remove uploaded prescription"
              title="Remove prescription"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                clearPrescriptionParse();
                clearPrescriptionDraft();
              }}
            >
              ×
            </button>
          </>
        ) : (
          <button
            type="button"
            className="home-rx-tab is-on"
            disabled={busy || disabled}
            onClick={() => {
              if (disabled) return;
              fileRef.current?.click();
            }}
          >
            {busy ? "Uploading…" : label}
          </button>
        )}
        {status ? <small className="home-rx-error">{status}</small> : null}
      </section>
      {showCart ? <HeaderCart className="home-rx-cart" disabled={disabled} /> : null}
    </div>
  );
}
