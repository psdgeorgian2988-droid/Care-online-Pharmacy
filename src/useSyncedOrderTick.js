import * as React from "react";
import { loadAllOrders, syncMyOrdersFromServer } from "./orderTracking";

/** Refresh the customer's orders so the home status stays current. */
export function useSyncedOrderTick() {
  const [ordersTick, setOrdersTick] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      await syncMyOrdersFromServer(loadAllOrders());
      if (!cancelled) setOrdersTick((n) => n + 1);
    };
    tick();
    const timer = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return ordersTick;
}
