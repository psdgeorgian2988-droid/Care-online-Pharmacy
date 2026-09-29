import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MEDICAL_RECORD_VIEWER_ACTIONS,
  downloadMedicalRecordFile,
  medicalRecordForViewer,
  medicalRecordListTitle,
  medicalRecordObjectUrl,
  medicalRecordStoredFileName,
  printMedicalRecordFile,
} from "./medicalRecord";

function isImageRecord(record) {
  const type = String(record?.fileType || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(String(record?.fileName || ""));
}

export default function RecordViewer({ record, onClose }) {
  const viewed = medicalRecordForViewer(record);
  const title = medicalRecordListTitle(viewed);
  const fileName = medicalRecordStoredFileName(viewed);
  const [src, setSrc] = useState("");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const url = medicalRecordObjectUrl(viewed);
    setSrc(url);
    const onKey = (event) => {
      if (event.key === "Escape") closeRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("has-record-viewer");
    document.body.classList.add("has-record-viewer");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("has-record-viewer");
      document.body.classList.remove("has-record-viewer");
    };
  }, [viewed.fileData, viewed.fileName, viewed.fileType]);

  const runAction = (action) => {
    if (action === "Print") {
      printMedicalRecordFile(viewed);
      return;
    }
    downloadMedicalRecordFile(viewed);
  };

  const overlay = (
    <div className="record-viewer" role="dialog" aria-modal="true" aria-label={fileName || title}>
      <style>{viewerStyles}</style>
      <div className="record-viewer-bar">
        <div className="record-viewer-title">
          <strong>{fileName || title}</strong>
        </div>
        <div className="record-viewer-actions">
          {MEDICAL_RECORD_VIEWER_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              className={action === "Print" ? "is-print" : "is-file"}
              onClick={() => runAction(action)}
            >
              {action}
            </button>
          ))}
          <button type="button" className="is-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="record-viewer-body">
        {src ? (
          isImageRecord(viewed) ? (
            <img src={src} alt={fileName || title} />
          ) : (
            <iframe title={fileName || title} src={src} />
          )
        ) : (
          <p className="empty">This record has no file to show.</p>
        )}
      </div>
    </div>
  );

  return typeof document === "undefined" ? overlay : createPortal(overlay, document.body);
}

const viewerStyles = `
.record-viewer{position:fixed;inset:0;z-index:200;background:#0f2433;display:flex;flex-direction:column}
.record-viewer-bar{flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 12px;background:#143246;color:#fff}
.record-viewer-title{display:flex;flex-direction:column;gap:2px;min-width:0}
.record-viewer-title strong{font-size:14px}
.record-viewer-actions{display:flex;gap:8px;flex-wrap:wrap}
.record-viewer-actions button{border:0;border-radius:8px;font:inherit;font-size:13px;font-weight:800;min-height:36px;padding:0 12px;cursor:pointer}
.record-viewer-actions .is-file{background:#fff;color:#143246}
.record-viewer-actions .is-print{background:#1a6b7a;color:#fff}
.record-viewer-actions .is-close{background:#2a4558;color:#fff}
.record-viewer-body{flex:1;min-height:0;background:#0b1c28;display:flex;align-items:center;justify-content:center}
.record-viewer-body img,.record-viewer-body iframe{width:100%;height:100%;border:0;background:#fff;object-fit:contain}
.record-viewer-body .empty{color:#c5d5df}
@media (max-width:800px){.record-viewer-bar{align-items:flex-start}}
@media print{.record-viewer-bar{display:none !important}.record-viewer{position:static;inset:auto;background:#fff}}
`;
