import { useEffect, useMemo, useState } from "react";
import { goBackHash, goToHash, parseAppHash } from "./hashRoute";
import {
  loadAllOrders,
  refreshOrderFromServer,
  syncMyOrdersFromServer,
  trackHref,
} from "./orderTracking";
import {
  CUSTOMER_SERVICE_TABS,
  countOrdersForCustomerTab,
  isCustomerServiceTab,
  isOngoingTrackOrder,
  ordersForCustomerTab,
  serviceKind,
} from "./orderStatus";
import OrderListTable from "./OrderListTable.jsx";
import OrderFullView from "./OrderFullView.jsx";
import ServiceIcon from "./serviceIcons";
import {
  isDiagnosticKind,
  mergeOrderReportIntoStore,
} from "./labPipeline";

function tabFromHash(hash) {
  const { service } = parseAppHash(hash);
  return isCustomerServiceTab(service) ? service : "";
}

function findListedOrder(orders, id) {
  const wanted = String(id || "").trim();
  if (!wanted) return null;
  return (
    orders.find(
      (order) =>
        String(order.id) === wanted ||
        String(order.bookingId) === wanted ||
        String(order.requestId) === wanted
    ) || null
  );
}

function myOrdersHash({ service = "", id = "" } = {}) {
  const params = new URLSearchParams();
  if (isCustomerServiceTab(service)) params.set("service", service);
  if (id) params.set("id", String(id));
  const query = params.toString();
  return query ? `#myorders?${query}` : "#myorders";
}

function emptyForTab(tab) {
  if (!tab) return "Choose a service to see your orders.";
  if (tab.label.toLowerCase().endsWith("order")) {
    return `No ${tab.label.toLowerCase()}s yet.`;
  }
  return `No ${tab.label} orders yet.`;
}

function MyOrders() {
  const [orders, setOrders] = useState(() => loadAllOrders());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [serviceTab, setServiceTab] = useState(() =>
    typeof window === "undefined" ? "" : tabFromHash(window.location.hash)
  );

  useEffect(() => {
    const syncSelected = () => {
      const { id, service } = parseAppHash(window.location.hash);
      setServiceTab(isCustomerServiceTab(service) ? service : "");
      if (!id) {
        setSelectedOrder(null);
        return;
      }
      setSelectedOrder((current) => {
        if (
          current &&
          (String(current.id) === id ||
            String(current.bookingId) === id ||
            String(current.requestId) === id)
        ) {
          return current;
        }
        return findListedOrder(orders, id) || current;
      });
    };
    syncSelected();
    window.addEventListener("hashchange", syncSelected);
    return () => window.removeEventListener("hashchange", syncSelected);
  }, [orders]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const next = await syncMyOrdersFromServer(loadAllOrders());
      if (cancelled) return;
      setOrders(next);
      setSelectedOrder((current) => {
        if (!current) return current;
        return (
          findListedOrder(next, current.id) ||
          findListedOrder(next, current.bookingId) ||
          findListedOrder(next, current.requestId) ||
          null
        );
      });
    };
    tick();
    const timer = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const handleSelectedChange = (next) => {
    setSelectedOrder(next);
    setOrders((current) =>
      current.map((order) => (String(order.id) === String(next.id) ? next : order))
    );
  };

  const activeTab = CUSTOMER_SERVICE_TABS.find((tab) => tab.value === serviceTab) || null;
  const tabOrders = useMemo(
    () => (serviceTab ? ordersForCustomerTab(orders, serviceTab) : []),
    [orders, serviceTab]
  );

  return (
    <div className="my-orders-page">
      <div className="orders-page-header">
        <div>
          <span className="orders-eyebrow">ACCOUNT</span>
          <h1>My Orders</h1>
        </div>
        {selectedOrder ? (
          <div className="orders-header-actions">
            <button
              type="button"
              className="orders-nav-btn orders-nav-orders"
              onClick={() => goBackHash()}
            >
              Back to Orders
            </button>
          </div>
        ) : null}
      </div>

      {selectedOrder ? (
        <div className="order-details-page">
          <OrderFullView order={selectedOrder} audience="customer" />
          {isOngoingTrackOrder(selectedOrder) ? (
            <div className="order-action-buttons">
              <a className="order-details-btn" href={trackHref(selectedOrder.id)}>
                Track order
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div
            className="my-orders-service-tiles"
            role="tablist"
            aria-label="Service"
          >
            {CUSTOMER_SERVICE_TABS.map((tab) => {
              const count = countOrdersForCustomerTab(orders, tab.value);
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={serviceTab === tab.value}
                  className={serviceTab === tab.value ? "is-on" : ""}
                  onClick={() => {
                    goToHash(myOrdersHash({ service: tab.value }));
                    setServiceTab(tab.value);
                    setSelectedOrder(null);
                  }}
                >
                  <ServiceIcon type={tab.value} title={tab.label} />
                  <span>{tab.label}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>

          {!serviceTab ? (
            <div className="orders-empty">
              <p>Choose a service to see your orders.</p>
            </div>
          ) : (
            <OrderListTable
              orders={tabOrders}
              audience="customer"
              empty={emptyForTab(activeTab)}
              onOpen={async (_id, order) => {
                const kind = serviceKind(order);
                goToHash(myOrdersHash({ service: kind, id: order.id }));
                setServiceTab(kind);
                setSelectedOrder(order);
                if (!isDiagnosticKind(order?.kind || order?.orderType)) return;
                const latest = await refreshOrderFromServer(order.bookingId || order.id);
                if (!latest) return;
                if (latest.reportFileData || latest.reportFileName) {
                  mergeOrderReportIntoStore(latest);
                }
                handleSelectedChange(latest);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default MyOrders;
