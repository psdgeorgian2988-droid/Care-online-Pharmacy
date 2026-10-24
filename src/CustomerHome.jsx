import { useState } from "react";
import { customerGreeting, needsCustomerWelcome, useLoginSession } from "./authSession";
import { loadAllOrders, trackHref } from "./orderTracking";
import { orderCurrentStatus } from "./orderStatus";
import CustomerWelcome from "./CustomerWelcome";
import HomeServiceCatalog from "./HomeServiceCatalog";
import { HomeWithAboutSlides } from "./HomeAboutSlides";
import LabsHub from "./LabsHub";
import { homeCatalogSectionKeys } from "./hashRoute";
import { useSyncedOrderTick } from "./useSyncedOrderTick";

export default function CustomerHome({ sectionKey = "" } = {}) {
  const user = useLoginSession();
  const hello = customerGreeting(user);
  const [welcomeTick, setWelcomeTick] = useState(0);
  useSyncedOrderTick();
  const activeOrder = activeOrderFromList(loadAllOrders());

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
        <HomeWithAboutSlides>
        <section className="account-more" aria-label="Services">
          <HomeServiceCatalog sectionKeys={homeCatalogSectionKeys(sectionKey)} />
        </section>
        </HomeWithAboutSlides>
      </div>
    );
  }

  return (
    <div className="app-home is-fill is-account">
      <HomeWithAboutSlides>
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

      <section className="account-more" aria-label="Services">
        <HomeServiceCatalog />
      </section>
      </HomeWithAboutSlides>
    </div>
  );
}

function activeOrderFromList(orders) {
  const open = (Array.isArray(orders) ? orders : []).filter(
    (order) =>
      !order.trackCompleted &&
      String(order.trackStatus || order.status || "").toLowerCase() !== "done"
  );
  open.sort(
    (a, b) =>
      (Number(b.updatedAt || b.sortKey || 0) || 0) -
      (Number(a.updatedAt || a.sortKey || 0) || 0)
  );
  return open[0] || null;
}
