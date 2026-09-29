import { useEffect, useRef, useState } from "react";
import { cleanOcrQuery, startVoiceSearch, textFromStripPhoto } from "./medicineStripSearch";

export default function MedicineSearchTools({ onQuery, onPhoto }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const handleVoice = () => {
    setStatus("Listening… say the brand or salt name.");
    setBusy(true);
    startVoiceSearch({
      onResult: (text) => {
        setStatus("");
        onPhoto?.(null);
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
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
    setFileName(file.name || "Medicine photo");
    setBusy(true);
    setStatus("Uploading photo…");
    try {
      const raw = await textFromStripPhoto(file);
      const query = cleanOcrQuery(raw);
      if (query.length < 2) {
        setStatus("Photo uploaded. Could not read the medicine name. Try a closer, brighter photo.");
        onPhoto?.({ query: "", previewUrl: nextPreview, fileName: file.name });
        return;
      }
      setStatus("");
      onPhoto?.({ query, previewUrl: nextPreview, fileName: file.name });
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
          {busy && /upload|reading|photo/i.test(status)
            ? "Reading photo…"
            : "Upload medicine photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handlePhoto}
        />
      </div>
      {previewUrl ? (
        <div className="med-search-photo-uploaded">
          <img src={previewUrl} alt={fileName || "Uploaded medicine photo"} />
          <span>{fileName || "Photo uploaded"}</span>
        </div>
      ) : null}
      {status ? <p className="med-search-tools-status">{status}</p> : null}
    </div>
  );
}
