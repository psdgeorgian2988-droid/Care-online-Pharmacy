import { useEffect, useMemo, useState } from "react";
import { customerGreeting, needsCustomerWelcome, useLoginSession } from "./authSession";
import {
  loadAllOrders,
  refreshOrderFromServer,
  trackHref,
} from "./orderTracking";
import { orderCurrentStatus } from "./orderStatus";
import { isAwaitingPartnerConfirm } from "./orderConfirm";
import CustomerWelcome from "./CustomerWelcome";
import HomeServiceCatalog from "./HomeServiceCatalog";
import HomePrescriptionUpload from "./HomePrescriptionUpload";
import LabsHub from "./LabsHub";
import { homeCatalogSectionKeys } from "./hashRoute";

export default function CustomerHome({ sectionKey = "" } = {}) {
  const user = useLoginSession();
  const hello = customerGreeting(user);
  const [welcomeTick, setWelcomeTick] = useState(0);
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

  if (needsCustomerWelcome(user)) {
    return (
      <CustomerWelcome
        key={welcomeTick}
        onDone={() => setWelcomeTick((n) => n + 1)}
      />
    );
  }

  if (sectionKey === "labs") {
    return <LabsHub />;
  }

  if (sectionKey) {
    return (
      <div className="app-home is-fill is-account">
        <section className="account-more" aria-label="Services">
          <HomeServiceCatalog sectionKeys={homeCatalogSectionKeys(sectionKey)} />
        </section>
      </div>
    );
  }

  return (
    <div className="app-home is-fill is-account">
      {hello ? <p className="app-home-hello">{hello}</p> : null}

      {activeOrder ? (
        <section className="app-home-panel app-home-order is-live" aria-label="Current Status">
          <div className="app-home-order-row">
            <div>
              <p className="app-home-panel-title">Current Status</p>
              <p className="app-home-order-status">
                {orderCurrentStatus(activeOrder)}
              </p>
            </div>
            <a className="app-home-cta app-home-cta-sm" href={trackHref(activeOrder.id)}>
              Track
            </a>
          </div>
        </section>
      ) : null}

      <HomePrescriptionUpload />

      <section className="account-more" aria-label="Services">
        <HomeServiceCatalog />
      </section>
    </div>
  );
}

function activeOrderFromList(orders) {
  return (
    orders.find(
      (order) =>
        !order.trackCompleted &&
        String(order.trackStatus || order.status || "").toLowerCase() !== "done"
    ) || null
  );
}
