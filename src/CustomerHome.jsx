import { useMemo, useState } from "react";
import { useFeatures } from "./featureFlags";
import { FEATURE_CATALOG, featureEnabled } from "./salesReport";
import { useLoginSession } from "./authSession";
import {
  kindLabel,
  loadAllOrders,
  trackHref,
} from "./orderTracking";
import CustomerWelcome, { needsCustomerWelcome } from "./CustomerWelcome";

export default function CustomerHome() {
  const features = useFeatures();
  const user = useLoginSession();
  const [welcomeTick, setWelcomeTick] = useState(0);
  const activeOrder = useMemo(() => activeOrderFromList(loadAllOrders()), []);

  const services = FEATURE_CATALOG.filter((row) => row.key !== "scanDelivery").map(
    (row) => ({
      key: row.key,
      href: row.href,
      title: String(row.label || "").toUpperCase(),
      on: featureEnabled(features, row.key),
    })
  );

  if (needsCustomerWelcome(user)) {
    return (
      <CustomerWelcome
        key={welcomeTick}
        onDone={() => setWelcomeTick((n) => n + 1)}
      />
    );
  }

  return (
    <div className="app-home is-fill">
      {activeOrder ? (
        <section className="app-home-panel app-home-order is-live" aria-label="Active order">
          <div className="app-home-order-row">
            <div>
              <p className="app-home-panel-title">Live order</p>
              <p className="app-home-order-status">
                {activeOrder.trackLabel ||
                  activeOrder.status ||
                  kindLabel(activeOrder.kind) ||
                  "In progress"}
              </p>
            </div>
            <a className="app-home-cta app-home-cta-sm" href={trackHref(activeOrder.id)}>
              Track
            </a>
          </div>
        </section>
      ) : null}

      <section className="app-home-services-wrap" aria-label="Services">
        <div className="app-home-services is-1">
          {services.map((service) => (
            <a
              key={service.key}
              className={`app-home-service${service.on ? "" : " is-off"}`}
              href={service.href}
            >
              <strong>{service.title}</strong>
            </a>
          ))}
        </div>
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
