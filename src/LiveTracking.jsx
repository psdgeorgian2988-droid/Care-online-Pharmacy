import { useEffect, useMemo, useRef, useState } from "react";
import {
  attachPinAndTracking,
  ensureTracking,
  etaLabel,
  haversineKm,
  isOngoingTrackOrder,
  isPartnerEnRoute,
  kindLabel,
  loadAllOrders,
  ongoingTrackOrders,
  partnerCopy,
  persistOrder,
  refreshOrderFromServer,
  resolveOrderById,
  stepLabel,
  tickTracking,
  TRACK_STEPS,
  trackHref,
} from "./orderTracking";
import { DIAGNOSTIC_TRACK_STEPS, isDiagnosticKind } from "./labPipeline";
import { orderCurrentStatus, trackKey } from "./orderStatus";
import { mapsUrlForPin, normalizePin, osmEmbedUrl } from "./pinLocation";
import AssignedAgent from "./AssignedAgent";
import ScanActions from "./ScanActions";
import OrderFeedbackCta from "./OrderFeedbackCta";
import OrderFullView from "./OrderFullView.jsx";
import ReturnMedicinePanel from "./ReturnMedicine.jsx";
import { pharmacyReturnRequestedFields } from "./pharmacyTrack";
import RefundStatusPanel from "./RefundStatus.jsx";

function mercatorY(lat) {
  const rad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

function trackingBbox(start, dest) {
  const minLat = Math.min(start.lat, dest.lat);
  const maxLat = Math.max(start.lat, dest.lat);
  const minLng = Math.min(start.lng, dest.lng);
  const maxLng = Math.max(start.lng, dest.lng);
  const latPad = Math.max((maxLat - minLat) * 0.38, 0.014);
  const lngPad = Math.max((maxLng - minLng) * 0.38, 0.014);
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function pointInBox(lat, lng, box, width, height) {
  const x = (lng - box.minLng) / (box.maxLng - box.minLng);
  const top = mercatorY(box.maxLat);
  const bottom = mercatorY(box.minLat);
  const y = (mercatorY(lat) - top) / (bottom - top);
  return {
    left: `${Math.min(96, Math.max(4, x * 100))}%`,
    top: `${Math.min(96, Math.max(4, y * 100))}%`,
    pixel: { x: x * width, y: y * height },
  };
}

function LiveMap({ order }) {
  const dest = {
    lat: Number(order.destLat ?? order.lat),
    lng: Number(order.destLng ?? order.lng),
  };
  const start = {
    lat: Number(order.startLat),
    lng: Number(order.startLng),
  };
  const partner = {
    lat: Number(order.partnerLat ?? start.lat),
    lng: Number(order.partnerLng ?? start.lng),
  };
  const ready =
    Number.isFinite(dest.lat) &&
    Number.isFinite(dest.lng) &&
    Number.isFinite(start.lat) &&
    Number.isFinite(start.lng);

  const box = useMemo(
    () => (ready ? trackingBbox(start, dest) : null),
    [ready, start.lat, start.lng, dest.lat, dest.lng]
  );

  const embedSrc = useMemo(() => {
    if (!box) return "";
    return `https://www.openstreetmap.org/export/embed.html?bbox=${box.minLng}%2C${box.minLat}%2C${box.maxLng}%2C${box.maxLat}&layer=mapnik`;
  }, [box]);

  if (!ready) {
    const fallback = osmEmbedUrl(dest.lat, dest.lng);
    return (
      <div className="live-map live-map-empty">
        {fallback ? (
          <iframe title="Destination map" src={fallback} loading="lazy" />
        ) : (
          <p>Map unavailable until a 6-digit PIN is saved.</p>
        )}
      </div>
    );
  }

  const destPos = pointInBox(dest.lat, dest.lng, box, 100, 100);
  const partnerPos = pointInBox(partner.lat, partner.lng, box, 100, 100);
  const copy = partnerCopy(order.kind);
  const mapsUrl = order.mapsUrl || mapsUrlForPin(order.pinCode);

  return (
    <div className="live-map">
      <iframe title={`Live map for PIN ${order.pinCode}`} src={embedSrc} />
      <div className="live-map-overlay" aria-hidden="true">
        <svg className="live-map-route" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line
            x1={parseFloat(partnerPos.left)}
            y1={parseFloat(partnerPos.top)}
            x2={parseFloat(destPos.left)}
            y2={parseFloat(destPos.top)}
            stroke="#1a6b7a"
            strokeWidth="0.7"
            strokeDasharray="2.2 1.6"
          />
        </svg>
        <div className="live-marker dest" style={{ left: destPos.left, top: destPos.top }}>
          <span>📍</span>
          <small>PIN {order.pinCode}</small>
        </div>
        <div
          className={`live-marker partner${
            order.trackCompleted || !isOngoingTrackOrder(order) ? " is-done" : ""
          }`}
          style={{ left: partnerPos.left, top: partnerPos.top }}
        >
          <span>{copy.emoji}</span>
          <small>{copy.title}</small>
        </div>
      </div>
      <a className="live-map-open" href={mapsUrl} target="_blank" rel="noopener noreferrer">
        Open area map
      </a>
    </div>
  );
}

function PinCapture({ order, onSaved }) {
  const [pin, setPin] = useState(normalizePin(order.pinCode));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const next = await attachPinAndTracking(order, pin);
      onSaved(next);
    } catch (err) {
      setError(err.message || "Could not save PIN.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="live-pin-form" onSubmit={handleSave}>
      <p>
        Add a 6-digit PIN so we can place this {kindLabel(order.kind).toLowerCase()} on the
        map and start live tracking.
      </p>
      <div className="live-pin-row">
        <input
          inputMode="numeric"
          maxLength="6"
          value={pin}
          onChange={(event) => setPin(normalizePin(event.target.value))}
          placeholder="6-digit PIN"
          aria-label="PIN code"
        />
        <button type="submit" disabled={saving}>
          {saving ? "Locating…" : "Save PIN & track"}
        </button>
      </div>
      {error ? <small>{error}</small> : null}
    </form>
  );
}

export function LiveTrackingPanel({ order, onOrderChange, compact = false, showScan }) {
  const [live, setLive] = useState(order);
  const liveRef = useRef(order);

  useEffect(() => {
    liveRef.current = order;
    setLive(order);
  }, [order?.id, order?.pinCode, order?.trackStartedAt, order?.trackCompleted, order?.trackStatus]);

  useEffect(() => {
    const id = order?.bookingId || order?.id || order?.requestId;
    if (!id) return undefined;
    let cancelled = false;
    const tick = async () => {
      const latest = await refreshOrderFromServer(id);
      if (cancelled || !latest) return;
      liveRef.current = { ...liveRef.current, ...latest };
      setLive((current) => ({ ...(current || {}), ...latest }));
      onOrderChange?.(latest);
    };
    tick();
    const timer = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [order?.id, order?.bookingId, order?.requestId]);

  useEffect(() => {
    const pin = normalizePin(order?.pinCode || order?.pin);
    if (!order || !/^\d{6}$/.test(pin)) return undefined;
    if (!isPartnerEnRoute(order)) {
      liveRef.current = order;
      setLive(order);
      return undefined;
    }

    let current = order.trackStartedAt ? order : ensureTracking(order);
    liveRef.current = current;
    setLive(current);
    onOrderChange?.(current);

    if (!isOngoingTrackOrder(current)) return undefined;

    let frame = 0;
    let lastPaint = 0;
    let lastPersist = 0;

    const loop = (stamp) => {
      if (stamp - lastPaint >= 90) {
        lastPaint = stamp;
        const next = tickTracking(liveRef.current, Date.now());
        liveRef.current = next;
        setLive(next);
        if (stamp - lastPersist >= 1000 || !isOngoingTrackOrder(next)) {
          lastPersist = stamp;
          const saved = persistOrder(next);
          liveRef.current = saved;
          onOrderChange?.(saved);
        }
      }
      if (isOngoingTrackOrder(liveRef.current)) {
        frame = window.requestAnimationFrame(loop);
      }
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [order?.id, order?.pinCode, order?.trackStartedAt, order?.trackCompleted, order?.trackStatus]);

  if (!live) return null;

  const pin = normalizePin(live.pinCode || live.pin);
  const currentStatus = orderCurrentStatus(live);
  const liveTrack = isOngoingTrackOrder(live);
  const showMap = isPartnerEnRoute(live);
  const closedKey = liveTrack ? "" : trackKey(live);
  const steps = (
    isDiagnosticKind(live.kind)
      ? DIAGNOSTIC_TRACK_STEPS.filter(
          (step) => step.key !== "declined" || live.trackStatus === "declined"
        )
      : TRACK_STEPS
  ).map((step) => ({
    ...step,
    label: step.key === "done" ? stepLabel(live.kind, "done") : step.label,
  }));
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === (live.trackStatus || "confirmed"))
  );
  const remainingKm = haversineKm(
    { lat: Number(live.partnerLat), lng: Number(live.partnerLng) },
    { lat: Number(live.destLat), lng: Number(live.destLng) }
  );

  return (
    <section className={`live-track${compact ? " is-compact" : ""}`}>
      <div className="live-track-head">
        <div>
          <span className="live-kicker">Current Status</span>
          <h3>{currentStatus}</h3>
        </div>
        {showMap ? (
          <div className={`live-eta${liveTrack ? "" : " is-done"}`}>
            <strong>
              {liveTrack
                ? etaLabel(live)
                : stepLabel(live.kind, closedKey === "declined" ? "declined" : "done")}
            </strong>
            <span>
              {liveTrack
                ? `${remainingKm < 0.1 ? "<0.1" : remainingKm.toFixed(1)} km remaining`
                : closedKey === "declined"
                  ? "This request is no longer active"
                  : "Partner reached your PIN"}
            </span>
          </div>
        ) : null}
      </div>

      <div className="live-timeline">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`live-step${index <= currentIndex ? " is-active" : ""}${
              index === currentIndex ? " is-current" : ""
            }`}
          >
            <span>{index < currentIndex || !liveTrack ? "✓" : index + 1}</span>
            <p>{step.label}</p>
          </div>
        ))}
      </div>

      {showMap ? <AssignedAgent record={live} compact={compact} /> : null}
      {showMap && showScan !== false ? <ScanActions order={live} app="customer" /> : null}
      {showMap && !/^\d{6}$/.test(pin) ? (
        <PinCapture order={live} onSaved={(next) => onOrderChange?.(next)} />
      ) : null}
      {showMap && /^\d{6}$/.test(pin) ? <LiveMap order={live} /> : null}
      <OrderFeedbackCta order={live} />
    </section>
  );
}

export default function TrackPage({ trackId }) {
  const [order, setOrder] = useState(null);
  const [missing, setMissing] = useState(false);
  const [others, setOthers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await resolveOrderById(trackId);
      if (cancelled) return;
      if (found) {
        const ready =
          isPartnerEnRoute(found) &&
          /^\d{6}$/.test(normalizePin(found.pinCode || found.pin))
            ? ensureTracking(found)
            : found;
        setOrder(ready);
        setMissing(false);
      } else {
        setOrder(null);
        setMissing(Boolean(trackId));
        setOthers(ongoingTrackOrders(loadAllOrders()));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  return (
    <div className="my-orders-page live-track-page">
      <div className="orders-page-header">
        <div>
          <span className="orders-eyebrow">TRACKING</span>
          <h1>Current Status</h1>
        </div>
        <a className="orders-home-link" href="#myorders">
          Back to My Orders
        </a>
      </div>

      {order ? (
        <div className="order-details-page live-track-wrap">
          <LiveTrackingPanel order={order} onOrderChange={setOrder} />
        </div>
      ) : (
        <div className="orders-empty">
          {missing ? (
            <p>No order found for this tracking link.</p>
          ) : (
            <p>Choose an order to track.</p>
          )}
          <div className="orders-empty-actions">
            {others.slice(0, 6).map((item) => (
              <a key={item.id} href={trackHref(item.id)}>
                Track {kindLabel(item.kind)} #{item.id}
              </a>
            ))}
            <a href="#myorders">Open My Orders</a>
          </div>
        </div>
      )}
    </div>
  );
}
