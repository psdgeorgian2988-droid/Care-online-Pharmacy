import { useEffect, useMemo, useState } from "react";
import { isAwaitingPartnerConfirm } from "./orderConfirm";
import { isOngoingTrackOrder, orderCurrentStatus } from "./orderStatus";
import { loadAllOrders, refreshOrderFromServer, trackHref } from "./orderTracking";

function activeOrderFromList(orders) {
  return (Array.isArray(orders) ? orders : []).find((order) => isOngoingTrackOrder(order)) || null;
}

export default function HomeCurrentStatus() {
  const [ordersTick, setOrdersTick] = useState(0);
  const activeOrder = useMemo(() => activeOrderFromList(loadAllOrders()), [ordersTick]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const rows = loadAllOrders();
      const pending = rows.filter((order) => {
        const kind = String(order?.kind || order?.orderType || "").toLowerCase();
        return kind === "stepdown" || isAwaitingPartnerConfirm(order);
      });
      for (const order of pending) {
        await refreshOrderFromServer(order.bookingId || order.id);
      }
      if (!cancelled) setOrdersTick((n) => n + 1);
    };
    tick();
    const timer = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!activeOrder) return null;

  const href = trackHref(activeOrder.id || activeOrder.bookingId);
  const detail = orderCurrentStatus(activeOrder);

  return (
    <div className="home-rx-cart-row home-track-row">
      <a
        className="home-rx-tab home-status-tab is-live"
        href={href}
        aria-label={`Track order: ${detail}`}
        title={detail}
      >
        Track
      </a>
    </div>
  );
}
