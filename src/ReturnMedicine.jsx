import { useRef, useState } from "react";
import { fileToReturnPhoto } from "./prescriptionDraft";
import {
  canCollectPharmacyReturn,
  canMarkPharmacyReturn,
  canReceivePharmacyReturn,
  isReturnPhoto,
  pharmacyReturnKey,
  pharmacyStatusLabel,
} from "./pharmacyTrack";

function ReturnPhoto({ src, label }) {
  if (!isReturnPhoto(src)) return null;
  return (
    <figure className="return-medicine-photo">
      <img src={src} alt={label} />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function PhotoCapture({
  id,
  mode = "upload",
  preview,
  busy,
  onPicked,
  label,
}) {
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const [status, setStatus] = useState("");
  const captureOnly = mode === "capture";

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus("");
    try {
      onPicked(await fileToReturnPhoto(file));
    } catch (err) {
      setStatus(err.message || "Could not use that photo.");
    }
  };

  return (
    <div className="return-medicine-capture">
      <p>{label}</p>
      {preview ? <ReturnPhoto src={preview.fileData || preview} label="Selected photo" /> : null}
      <input
        ref={cameraRef}
        id={`${id}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={busy}
        onChange={onFile}
      />
      {captureOnly ? null : (
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={onFile}
        />
      )}
      <div className="return-medicine-actions">
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()}>
          {busy ? "Saving…" : preview ? "Retake photo" : "Take photo"}
        </button>
        {captureOnly ? null : (
          <button
            type="button"
            className="is-quiet"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? "Replace photo" : "Upload photo"}
          </button>
        )}
      </div>
      {status ? <p className="return-medicine-error">{status}</p> : null}
    </div>
  );
}

export default function ReturnMedicinePanel({
  order,
  audience = "customer",
  busy = false,
  onRequest,
  onCollect,
  onReceive,
}) {
  const [reason, setReason] = useState(order?.returnReason || "");
  const [customerPhoto, setCustomerPhoto] = useState(null);
  const [collectPhoto, setCollectPhoto] = useState(null);
  const [error, setError] = useState("");
  const key = pharmacyReturnKey(order);
  if (!order) return null;

  const submitRequest = () => {
    if (!isReturnPhoto(customerPhoto?.fileData)) {
      setError("Upload a photo of the medicine to request a return.");
      return;
    }
    setError("");
    onRequest?.(order, reason, customerPhoto);
  };

  const submitCollect = () => {
    if (!isReturnPhoto(collectPhoto?.fileData)) {
      setError("Capture a photo while collecting the return medicine.");
      return;
    }
    setError("");
    onCollect?.(order, collectPhoto);
  };

  if (key === "returned") {
    return (
      <div className="return-medicine-panel">
        <style>{styles}</style>
        <p className="return-medicine-status">{pharmacyStatusLabel(key)}</p>
        {order.returnReason ? <p>Reason: {order.returnReason}</p> : null}
        <ReturnPhoto src={order.returnCustomerPhoto} label="Customer return photo" />
        <ReturnPhoto src={order.returnCollectPhoto} label="Collection photo" />
        <p>The pharmacy has received this return.</p>
      </div>
    );
  }

  if (key === "return_collected") {
    return (
      <div className="return-medicine-panel">
        <style>{styles}</style>
        <p className="return-medicine-status">{pharmacyStatusLabel(key)}</p>
        {order.returnReason ? <p>Reason: {order.returnReason}</p> : null}
        <ReturnPhoto src={order.returnCustomerPhoto} label="Customer return photo" />
        <ReturnPhoto src={order.returnCollectPhoto} label="Collection photo" />
        {audience === "partner" && onReceive && canReceivePharmacyReturn(order) ? (
          <button type="button" disabled={busy} onClick={() => onReceive(order)}>
            Return received at pharmacy
          </button>
        ) : (
          <p>Return collected. The pharmacy will confirm receipt.</p>
        )}
      </div>
    );
  }

  if (key === "return_requested") {
    const collector = audience === "delivery" || audience === "partner";
    return (
      <div className="return-medicine-panel">
        <style>{styles}</style>
        <p className="return-medicine-status">{pharmacyStatusLabel(key)}</p>
        {order.returnReason ? <p>Reason: {order.returnReason}</p> : null}
        <ReturnPhoto src={order.returnCustomerPhoto} label="Customer return photo" />
        {collector && onCollect && canCollectPharmacyReturn(order) ? (
          <>
            <PhotoCapture
              id={`return-collect-${order.id || "job"}`}
              mode="capture"
              preview={collectPhoto}
              busy={busy}
              onPicked={setCollectPhoto}
              label="Capture a photo while collecting the return medicine."
            />
            {error ? <p className="return-medicine-error">{error}</p> : null}
            <button type="button" disabled={busy} onClick={submitCollect}>
              Collect return
            </button>
          </>
        ) : (
          <p>The delivery partner will capture a photo when collecting this return.</p>
        )}
      </div>
    );
  }

  if (!canMarkPharmacyReturn(order) || !onRequest || audience !== "customer") return null;

  return (
    <div className="return-medicine-panel">
      <style>{styles}</style>
      <p className="return-medicine-status">Return medicine</p>
      <p>Upload a photo of the medicine. The delivery partner will capture another photo when collecting it.</p>
      <label>
        Return reason (optional)
        <input
          value={reason}
          maxLength={240}
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Damaged, unused, wrong item…"
        />
      </label>
      <PhotoCapture
        id={`return-customer-${order.id || "job"}`}
        mode="upload"
        preview={customerPhoto}
        busy={busy}
        onPicked={(photo) => {
          setCustomerPhoto(photo);
          setError("");
        }}
        label="Photo of the medicine to return"
      />
      {error ? <p className="return-medicine-error">{error}</p> : null}
      <button type="button" disabled={busy} onClick={submitRequest}>
        Request return
      </button>
    </div>
  );
}

const styles = `
.return-medicine-panel{margin:10px 0;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd;display:grid;gap:8px}
.return-medicine-panel p{margin:0;font-size:12px;line-height:1.4;color:#34546b}
.return-medicine-status{font-weight:800;color:#1a6b7a}
.return-medicine-panel label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:#34546b}
.return-medicine-panel input[type="text"],.return-medicine-panel input:not([type="file"]){width:100%;box-sizing:border-box;min-height:36px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:6px;font:inherit;font-size:13px;background:#fff}
.return-medicine-panel input[type="file"]{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}
.return-medicine-actions{display:flex;flex-wrap:wrap;gap:6px}
.return-medicine-panel button{border:0;border-radius:6px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;min-height:32px;padding:6px 10px;cursor:pointer;justify-self:start}
.return-medicine-panel button.is-quiet{background:#fff;color:#1a6b7a;border:1px solid #1a6b7a}
.return-medicine-panel button:disabled{opacity:.65;cursor:wait}
.return-medicine-error{color:#b64b4b !important;font-weight:700}
.return-medicine-photo{margin:0;padding:8px;border:1px dashed #c5d6e0;border-radius:8px;background:#fff;text-align:center}
.return-medicine-photo img{display:block;width:100%;max-width:220px;max-height:180px;object-fit:contain;margin:0 auto 6px}
.return-medicine-photo figcaption{font-size:11px;font-weight:700;color:#1a6b7a}
.return-medicine-capture{display:grid;gap:6px}
`;
