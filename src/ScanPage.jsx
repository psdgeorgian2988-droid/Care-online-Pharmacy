import { useEffect, useRef, useState } from "react";
import { LiveTrackingPanel } from "./LiveTracking";
import { CheckpointStrip } from "./OrderQr";
import {
  ensureTracking,
  persistOrder,
  resolveOrderById,
} from "./orderTracking";
import { normalizePin } from "./pinLocation";
import {
  checkpointLabel,
  expectedItems,
  mismatchRedeliveryPatch,
  nextQrScanAction,
  normalizeScanStep,
  parseOrderQrMeta,
  qrMatchesOrder,
  qrScanPatch,
  scanActionLabel,
  scanPageHeading,
  scanStepHint,
  scanStepTitle,
} from "./orderQr";

async function resolveOrder(id) {
  return resolveOrderById(id);
}

export default function ScanPage({ scanId, scanStep }) {
  const requestedStep = normalizeScanStep(scanStep);
  const [manual, setManual] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const applied = useRef("");

  const loadOrder = async (raw) => {
    const meta = parseOrderQrMeta(raw);
    const id = meta.id || String(raw || "").trim();
    if (!id) {
      setError("Could not read an order id from that QR.");
      return;
    }
    if (applied.current === id && result?.order) return;
    setBusy(true);
    setError("");
    try {
      const found = await resolveOrder(id);
      if (!found) {
        setError(
          "No order found for this QR. Ask the customer to open MediHome on this device, or try again after the order is saved."
        );
        return;
      }
      const match = qrMatchesOrder(found, id, meta.contents);
      applied.current = id;
      setResult({
        order: found,
        action: match.ok ? "review" : "mismatch",
        scannedId: id,
        scannedSig: meta.contents,
        autoMismatch: !match.ok,
        mismatchReason: match.reason,
      });
      const nextHash = requestedStep
        ? `#scan?id=${encodeURIComponent(id)}&step=${requestedStep}`
        : `#scan?id=${encodeURIComponent(id)}`;
      if (window.location.hash !== nextHash && !window.location.hash.includes(id)) {
        window.history.replaceState(null, "", nextHash);
      }
    } catch (err) {
      setError(err.message || "Could not open this order from the scan.");
    } finally {
      setBusy(false);
    }
  };

  const applyDecision = async (matched) => {
    if (!result?.order) return;
    setBusy(true);
    setError("");
    try {
      const stage = nextQrScanAction(result.order);
      if (matched && requestedStep && stage !== "already_done" && stage !== requestedStep) {
        setError(
          `This ${scanStepTitle(result.order.kind, requestedStep, result.order.serviceType)} is for a different checkpoint. Current check is ${checkpointLabel(stage)}.`
        );
        return;
      }
      const { action, patch } = matched
        ? qrScanPatch(result.order)
        : mismatchRedeliveryPatch(result.order, stage === "already_done" ? "deliver" : stage);
      const updated =
        action === "already_done" ? result.order : persistOrder(result.order, patch);
      const ready =
        /^\d{6}$/.test(normalizePin(updated.pinCode || updated.pin)) &&
        (action === "pickup" || action === "deliver")
          ? ensureTracking(updated)
          : updated;
      setResult({
        order: ready,
        action,
        decided: true,
        scannedId: result.scannedId,
      });
    } catch (err) {
      setError(err.message || "Could not update this order from the scan.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (scanId) loadOrder(scanId);
  }, [scanId]);

  useEffect(() => {
    if (result?.order || scanId) return undefined;
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setHint("Use the file picker or type the order id if the camera is not available.");
      return undefined;
    }
    let stream;
    let timer;
    let detector;
    let stopped = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        video.srcObject = stream;
        await video.play();
        if (typeof window.BarcodeDetector !== "function") {
          setHint("This browser cannot live-read QR. Upload a photo of the code or type the order id.");
          return;
        }
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue;
              if (value) {
                stopped = true;
                await loadOrder(value);
                return;
              }
            }
          } catch {
            /* keep scanning */
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch {
        setHint("Camera permission was not given. Upload a photo of the QR or type the order id.");
      }
    };
    start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [result?.order, scanId]);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (typeof window.BarcodeDetector !== "function") {
      setError("This browser cannot read a QR photo. Type the order id instead.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const codes = await detector.detect(bitmap);
      bitmap.close?.();
      const value = codes[0]?.rawValue;
      if (!value) {
        setError("No QR code found in that photo.");
        return;
      }
      await loadOrder(value);
    } catch {
      setError("Could not read that image.");
    }
  };

  const next = result?.order ? nextQrScanAction(result.order) : "";
  const items = result?.order ? expectedItems(result.order) : [];
  const awaitingDecision = Boolean(result?.order && !result?.decided);
  const kind = result?.order?.kind || "";
  const serviceType = result?.order?.serviceType || "";
  const heading = scanPageHeading(requestedStep, kind, serviceType);
  const stepMismatch =
    Boolean(requestedStep && next && next !== "already_done" && next !== requestedStep);
  const canConfirmMatch = awaitingDecision && next !== "already_done" && !result?.autoMismatch && !stepMismatch;

  return (
    <div className="my-orders-page live-track-page">
      <style>{styles}</style>
      <div className="orders-page-header">
        <div>
          <span className="orders-eyebrow">QR SCAN</span>
          <h1>{heading}</h1>
          <p className="orders-subtitle">
            {requestedStep
              ? scanStepHint(kind || "medicine", requestedStep, serviceType)
              : "Staff scan packing, partners scan pickup, and customers scan delivery. If the medicines or service do not match the order, stop and restart redelivery of the correct items."}
          </p>
        </div>
        <a className="orders-home-link" href="#myorders">
          My Orders
        </a>
      </div>

      {result?.order ? (
        <div className="order-details-page live-track-wrap">
          {result.decided ? (
            <p className={`scan-result is-${result.action}`}>
              {scanActionLabel(result.action)}
              {result.action === "pack"
                ? " — packing confirmed. Next scan is pickup."
                : result.action === "pickup"
                  ? " — pickup confirmed. Tracking is live until delivery."
                  : result.action === "deliver"
                    ? " — delivery confirmed. This order is complete."
                    : result.action === "mismatch"
                      ? " — delivery stopped. Pack the correct medicines or service and start again from packing."
                      : " — this order already passed all three checks."}
            </p>
          ) : (
            <p
              className={`scan-result is-${
                result.autoMismatch ? "mismatch" : next === "already_done" ? "already_done" : "review"
              }`}
            >
              {result.autoMismatch
                ? "This QR does not match the ordered items. Stop and restart redelivery of the correct medicines or service."
                : next === "already_done"
                  ? "All three checks are already complete."
                  : stepMismatch
                    ? `This screen is ${scanStepTitle(kind, requestedStep, serviceType)}. Current check is ${checkpointLabel(next)}. Use the matching app: staff packing, partner pickup, customer or service-provider delivery.`
                    : `Checkpoint ${scanStepTitle(kind, next, serviceType)} — confirm the packed medicines or service match this order.`}
            </p>
          )}

          <CheckpointStrip order={result.order} />
          {Number(result.order.redeliveryCount || 0) > 0 ? (
            <p className="scan-redeliver">
              Redelivery #{result.order.redeliveryCount}. Previous mismatch at{" "}
              {checkpointLabel(result.order.lastMismatchStage) || "a checkpoint"}.
            </p>
          ) : null}

          <div className="scan-items">
            <h2>Ordered medicines / service</h2>
            {items.length ? (
              <ul>
                {items.map((item) => (
                  <li key={`${item.name}-${item.qty}`}>
                    <strong>{item.name}</strong>
                    {item.extra ? ` · ${item.extra}` : ""}
                    {item.qty > 1 ? ` × ${item.qty}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No line items on this booking. Confirm the service name and PIN still match.</p>
            )}
          </div>

          {awaitingDecision && next !== "already_done" ? (
            <div className="scan-decide">
              {canConfirmMatch ? (
                <button
                  type="button"
                  className="scan-match"
                  disabled={busy}
                  onClick={() => applyDecision(true)}
                >
                  Matches Order — Confirm {checkpointLabel(next)}
                </button>
              ) : null}
              <button
                type="button"
                className="scan-mismatch"
                disabled={busy}
                onClick={() => applyDecision(false)}
              >
                Mismatch — Stop And Redeliver
              </button>
            </div>
          ) : null}

          {error ? <p className="scan-error">{error}</p> : null}

          <LiveTrackingPanel
            order={result.order}
            onOrderChange={(nextOrder) =>
              setResult((prev) => ({ ...prev, order: nextOrder }))
            }
            showScan={false}
          />
          <button
            type="button"
            className="service-submit scan-again"
            onClick={() => {
              applied.current = "";
              setResult(null);
              window.history.replaceState(null, "", "#scan");
              window.dispatchEvent(new HashChangeEvent("hashchange"));
            }}
          >
            Scan another QR
          </button>
        </div>
      ) : (
        <div className="scan-panel">
          <video ref={videoRef} playsInline muted autoPlay className="scan-video" />
          <p>{busy ? "Opening this order…" : hint || "Point the camera at the order QR."}</p>
          {error ? <p className="scan-error">{error}</p> : null}
          <label className="scan-file">
            Upload QR photo
            <input type="file" accept="image/*" capture="environment" onChange={onFile} />
          </label>
          <form
            className="scan-manual"
            onSubmit={(event) => {
              event.preventDefault();
              loadOrder(manual);
            }}
          >
            <label htmlFor="scan-id">Or type order id</label>
            <div>
              <input
                id="scan-id"
                value={manual}
                onChange={(event) => setManual(event.target.value)}
                placeholder="MH-HC-123456"
              />
              <button type="submit" disabled={busy}>
                Open
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = `
.scan-panel{max-width:560px;margin:0 auto;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px;text-align:center}
.scan-video{width:100%;max-height:320px;border-radius:10px;background:#143246;object-fit:cover}
.scan-panel p{margin:10px 0;color:#34546b;font-size:14px}
.scan-error{color:#d84b4b !important}
.scan-file{display:inline-block;margin:6px 0;padding:8px 12px;border-radius:8px;background:#1a6b7a;color:#fff;font-weight:800;cursor:pointer}
.scan-file input{display:none}
.scan-manual{margin-top:12px;text-align:left}
.scan-manual label{display:block;margin-bottom:6px;font-size:12px;font-weight:700;color:#34546b}
.scan-manual div{display:flex;gap:8px}
.scan-manual input{flex:1;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit}
.scan-manual button,.scan-again{border:none;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-weight:700;padding:8px 12px;cursor:pointer}
.scan-result{margin:0 0 8px;padding:10px 12px;border-radius:10px;font-weight:800}
.scan-result.is-pack{background:#e8f4f6;color:#1a6b7a}
.scan-result.is-pickup{background:#e7f0ff;color:#2a7de1}
.scan-result.is-deliver{background:#e5f8ee;color:#1c9b61}
.scan-result.is-already_done{background:#fff7e8;color:#b36b00}
.scan-result.is-review{background:#e8f4f6;color:#1a6b7a}
.scan-result.is-mismatch{background:#fdecec;color:#b42318}
.scan-redeliver{margin:0 0 10px;color:#b42318;font-weight:700}
.scan-items{margin:0 0 12px;padding:12px;border:1px solid #e4ecef;border-radius:10px;background:#fff;text-align:left}
.scan-items h2{margin:0 0 8px;font-size:14px}
.scan-items ul{margin:0;padding-left:18px}
.scan-items li{margin:0 0 4px;color:#143246}
.scan-decide{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.scan-match,.scan-mismatch{border:none;border-radius:8px;color:#fff;font:inherit;font-weight:800;padding:10px 12px;cursor:pointer}
.scan-match{background:#1c9b61}
.scan-mismatch{background:#b42318}
.scan-again{display:block;margin:14px auto 0}
`;
