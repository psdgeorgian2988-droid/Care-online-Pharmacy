import { useEffect, useMemo, useState } from "react";
import { isAwaitingPartnerConfirm } from "./orderConfirm";
import { isOngoingTrackOrder, orderCurrentStatus } from "./orderStatus";
import { loadAllOrders, refreshOrderFromServer, trackHref } from "./orderTracking";

function orderKind(order) {
  return String(order?.kind || order?.orderType || "").toLowerCase();
}

function activeOrderFromList(orders, kinds) {
  const live = (Array.isArray(orders) ? orders : []).filter(isOngoingTrackOrder);
  if (!kinds?.length) return live[0] || null;
  const want = new Set(kinds.map((kind) => String(kind).toLowerCase()));
  return live.find((order) => want.has(orderKind(order))) || null;
}

let lastPendingRefreshAt = 0;
let pendingRefresh = null;

function refreshPendingOrders() {
  const now = Date.now();
  if (pendingRefresh) return pendingRefresh;
  if (now - lastPendingRefreshAt < 5000) return Promise.resolve();
  lastPendingRefreshAt = now;
  pendingRefresh = (async () => {
    const rows = loadAllOrders();
    const pending = rows.filter((order) => {
      const kind = orderKind(order);
      return kind === "stepdown" || isAwaitingPartnerConfirm(order);
    });
    for (const order of pending) {
      await refreshOrderFromServer(order.bookingId || order.id);
    }
  })().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

export default function HomeCurrentStatus({ kinds, bare = false } = {}) {
  const [ordersTick, setOrdersTick] = useState(0);
  const kindKey = Array.isArray(kinds) ? kinds.join(",") : "";
  const activeOrder = useMemo(
    () => activeOrderFromList(loadAllOrders(), kindKey ? kindKey.split(",") : undefined),
    [ordersTick, kindKey]
  );

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      await refreshPendingOrders();
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
  const pill = (
    <a
      className="home-rx-tab home-status-tab is-live"
      href={href}
      aria-label={`Track order: ${detail}`}
      title={detail}
    >
      Track
    </a>
  );

  if (bare) return pill;

  return <div className="home-rx-cart-row home-track-row">{pill}</div>;
}
