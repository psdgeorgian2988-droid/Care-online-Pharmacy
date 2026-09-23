import { useMemo, useState } from "react";
import { useLoginSession } from "./authSession";
import {
  loadAllOrders,
  trackHref,
} from "./orderTracking";
import { orderCurrentStatus } from "./orderStatus";
import CustomerWelcome, { needsCustomerWelcome } from "./CustomerWelcome";
import HomeServiceCatalog from "./HomeServiceCatalog";
import HomePrescriptionUpload from "./HomePrescriptionUpload";

export default function CustomerHome() {
  const user = useLoginSession();
  const [welcomeTick, setWelcomeTick] = useState(0);
  const activeOrder = useMemo(() => activeOrderFromList(loadAllOrders()), []);

  if (needsCustomerWelcome(user)) {
    return (
      <CustomerWelcome
        key={welcomeTick}
        onDone={() => setWelcomeTick((n) => n + 1)}
      />
    );
  }

  return (
    <div className="app-home is-fill is-account">
      {user?.name ? (
        <p className="app-home-hello">Hello, {String(user.name).split(" ")[0]}</p>
      ) : null}

      {activeOrder ? (
        <section className="app-home-panel app-home-order is-live" aria-label="Current status">
          <div className="app-home-order-row">
            <div>
              <p className="app-home-panel-title">Current status</p>
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
