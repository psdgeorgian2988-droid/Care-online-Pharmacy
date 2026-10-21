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

  return (
    <div className="home-rx-cart-row">
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
          onChange={onFile}
        />
        <input
          ref={fileRef}
          id={`${idPrefix}RxFile`}
          type="file"
          accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
          onChange={onFile}
        />
        {draft?.fileName ? (
          <>
            <a
              className="home-rx-tab is-on"
              href="#prescription"
              onClick={(event) => {
                event.preventDefault();
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
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? "Uploading…" : "Replace"}
            </button>
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
          </>
        ) : (
          <button
            type="button"
            className="home-rx-tab is-on"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Uploading…" : "Upload Rx"}
          </button>
        )}
        {status ? <small className="home-rx-error">{status}</small> : null}
      </section>
      {showCart ? <HeaderCart className="home-rx-cart" /> : null}
    </div>
  );
}
