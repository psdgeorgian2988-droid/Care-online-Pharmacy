import { useRef, useState } from "react";
import {
  cleanOcrQuery,
  startVoiceSearch,
  textFromStripPhoto,
  voiceSearchSupported,
} from "./medicineStripSearch";

export default function MedicineSearchTools({ onQuery }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const handleVoice = () => {
    setStatus("Listening… say the brand or salt name.");
    setBusy(true);
    startVoiceSearch({
      onResult: (text) => {
        setStatus("");
        onQuery(text);
      },
      onError: (message) => setStatus(message),
      onEnd: () => setBusy(false),
    });
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setStatus("Reading the strip photo…");
    try {
      const raw = await textFromStripPhoto(file);
      const query = cleanOcrQuery(raw);
      if (query.length < 2) {
        setStatus(
          "Could not read brand or composition. Photograph the name side of the strip, in good light."
        );
        return;
      }
      setStatus(`Found: ${query}`);
      onQuery(query);
    } catch (error) {
      setStatus(error.message || "Could not read this photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="med-search-tools">
      <div className="med-search-tools-row">
        <button
          type="button"
          className="med-search-tool"
          onClick={handleVoice}
          disabled={busy}
        >
          {busy && status.startsWith("Listening") ? "Listening…" : "Voice search"}
        </button>
        <button
          type="button"
          className="med-search-tool"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy && status.startsWith("Reading") ? "Reading photo…" : "Photo of strip"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handlePhoto}
        />
      </div>
      <p className="med-search-tools-hint">
        Photograph the brand name or composition printed on the strip you take
        now. We search the same combination in MediHome.
        {!voiceSearchSupported()
          ? " Voice needs Chrome, Edge, or Safari."
          : ""}
      </p>
      {status ? <p className="med-search-tools-status">{status}</p> : null}
    </div>
  );
}
