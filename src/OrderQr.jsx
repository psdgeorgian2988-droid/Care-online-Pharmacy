import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { nextQrScanAction, orderIdOf, orderQrUrl, trackQrPath } from "./orderQr";

export function CheckpointStrip() {
  return null;
}

export default function OrderQr({ order, compact = false, audience = "customer" }) {
  const id = orderIdOf(order);
  const [src, setSrc] = useState("");
  const next = nextQrScanAction(order);
  const redelivery = Number(order?.redeliveryCount || 0);
  const delivered = next === "already_done";
  const pickupDue = next === "pack" || next === "pickup";

  useEffect(() => {
    if (!id) {
      setSrc("");
      return undefined;
    }
    let cancelled = false;
    QRCode.toDataURL(orderQrUrl(id, order), {
      margin: 1,
      width: compact ? 72 : 128,
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
        {redelivery > 0 ? (
          <p className="order-qr-warn">
            Redelivery #{redelivery}
            {order?.lastMismatchStage ? ` after a mismatch.` : "."} Use the same
            QR to pick up this order again.
          </p>
        ) : null}
        {audience === "customer" && order?.deliverOtp ? (
          <p className="order-qr-otp">
            Delivery OTP: <strong>{order.deliverOtp}</strong>
          </p>
        ) : null}
        {audience === "pharmacy" ? (
          <p>Print this QR for pickup and delivery.</p>
        ) : audience === "partner" ? (
          <p>
            {delivered
              ? "Already delivered."
              : pickupDue
                ? "Scan to pick up this order."
                : "Customer scans this QR on delivery."}
          </p>
        ) : (
          <p>
            {delivered
              ? "Already delivered."
              : "Scan this QR on delivery."}
          </p>
        )}
        <div className="order-qr-links">
          <a href={trackQrPath(id)}>Track live</a>
        </div>
      </aside>
    </>
  );
}

const styles = `
.order-qr{margin:8px 0;padding:8px 10px;border:1px dashed #1a6b7a;border-radius:10px;background:#fff;text-align:center;color:#143246;max-width:168px}
.order-qr-kicker{margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1a6b7a}
.order-qr img{width:96px;height:96px;display:block;margin:0 auto 4px;background:#fff}
.order-qr.is-compact{max-width:132px;padding:6px 8px;margin:6px 0}
.order-qr.is-compact img{width:72px;height:72px}
.order-qr-wait{min-height:40px;display:grid;place-items:center;color:#5d7180;font-size:11px}
.order-qr-id{margin:0 0 2px;font-weight:800;font-size:12px}
.order-qr-otp{margin:0 0 4px !important;font-size:12px !important;font-weight:800;color:#1a6b7a !important}
.order-qr p{margin:0 auto 4px;max-width:18ch;font-size:11px;line-height:1.3;color:#34546b}
.order-qr-warn{color:#b42318 !important;font-weight:700}
.order-qr-links{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
.order-qr-links a{font-size:11px;font-weight:800;color:#1a6b7a;text-decoration:none}
`;
