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

  const href = activeOrder
    ? trackHref(activeOrder.id || activeOrder.bookingId)
    : "#myorders";
  const detail = activeOrder ? orderCurrentStatus(activeOrder) : "Current Status";

  return (
    <a
      className={`home-rx-tab home-status-tab${activeOrder ? " is-live" : ""}`}
      href={href}
      aria-label={activeOrder ? `Current Status: ${detail}` : "Current Status"}
      title={detail}
    >
      Current Status
    </a>
  );
}
