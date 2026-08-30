import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  CHECKPOINT_STEPS,
  checkpointState,
  nextQrScanAction,
  orderIdOf,
  orderQrUrl,
  trackQrPath,
} from "./orderQr";

export function CheckpointStrip({ order }) {
  const checks = checkpointState(order);
  const next = nextQrScanAction(order);
  return (
    <ol className="order-checks">
      {CHECKPOINT_STEPS.map((step, index) => {
        const done = Boolean(checks[step.key]);
        const current = next === step.key;
        return (
          <li
            key={step.key}
            className={`order-check${done ? " is-done" : ""}${current ? " is-current" : ""}`}
          >
            <span>{done ? "✓" : index + 1}</span>
            <p>{step.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderQr({ order, compact = false }) {
  const id = orderIdOf(order);
  const [src, setSrc] = useState("");
  const next = nextQrScanAction(order);
  const redelivery = Number(order?.redeliveryCount || 0);

  useEffect(() => {
    if (!id) {
      setSrc("");
      return undefined;
    }
    let cancelled = false;
    QRCode.toDataURL(orderQrUrl(id, order), {
      margin: 1,
      width: compact ? 132 : 196,
      color: { dark: "#143246", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [id, compact, order?.items, order?.carePlanLabel, order?.serviceLabel]);

  if (!id) return null;

  return (
    <>
      <style>{styles}</style>
      <aside className={`order-qr${compact ? " is-compact" : ""}`}>
        <p className="order-qr-kicker">Order QR</p>
        {src ? (
          <img src={src} alt={`QR code for order ${id}`} />
        ) : (
          <div className="order-qr-wait">Preparing QR…</div>
        )}
        <p className="order-qr-id">#{id}</p>
        <CheckpointStrip order={order} />
        {redelivery > 0 ? (
          <p className="order-qr-warn">
            Redelivery #{redelivery}
            {order?.lastMismatchStage
              ? ` after a mismatch at ${order.lastMismatchStage}.`
              : "."}{" "}
            Pack the ordered items again and restart the three checks.
          </p>
        ) : null}
        <p>
          Scan Delivery is used when the rider receives this medicine order from
          the retailer, and again when the customer receives it. Staff can open
          the same checks from the admin desk.
        </p>
        <p>
          Next check:{" "}
          {next === "already_done"
            ? "all three checks are complete."
            : next === "pack"
              ? "packing"
              : next === "pickup"
                ? "pickup"
                : "delivery"}
          .
        </p>
        <div className="order-qr-links">
          <a href={trackQrPath(id)}>Track live</a>
        </div>
      </aside>
    </>
  );
}

const styles = `
.order-qr{margin:12px 0;padding:14px 16px;border:1px dashed #1a6b7a;border-radius:12px;background:#fff;text-align:center;color:#143246}
.order-qr-kicker{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1a6b7a}
.order-qr img{width:196px;height:196px;display:block;margin:0 auto 8px;background:#fff}
.order-qr.is-compact img{width:120px;height:120px}
.order-qr-wait{min-height:80px;display:grid;place-items:center;color:#5d7180;font-size:13px}
.order-qr-id{margin:0 0 6px;font-weight:800}
.order-qr p{margin:0 auto 8px;max-width:40ch;font-size:12px;line-height:1.45;color:#34546b}
.order-qr-warn{color:#b42318 !important;font-weight:700}
.order-qr-links{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.order-qr-links a{font-size:12px;font-weight:800;color:#1a6b7a;text-decoration:none}
.order-checks{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;list-style:none;margin:8px 0 10px;padding:0}
.order-check{margin:0;padding:8px 4px;border:1px solid #d7e2e9;border-radius:8px;background:#f7fafc}
.order-check span{display:grid;place-items:center;width:22px;height:22px;margin:0 auto 4px;border-radius:50%;background:#d7e2e9;color:#143246;font-size:11px;font-weight:800}
.order-check p{margin:0;font-size:11px;font-weight:800;color:#34546b}
.order-check.is-done{border-color:#b7e4c7;background:#e8f8ee}
.order-check.is-done span{background:#1c9b61;color:#fff}
.order-check.is-current{border-color:#1a6b7a;background:#e8f4f6}
.order-check.is-current span{background:#1a6b7a;color:#fff}
`;
