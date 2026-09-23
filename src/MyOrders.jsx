import { useEffect, useState } from "react";
import { LiveTrackingPanel } from "./LiveTracking";
import {
  kindLabel,
  loadAllOrders,
  persistOrder,
  refreshOrderFromServer,
  trackHref,
} from "./orderTracking";
import { orderCurrentStatus } from "./orderStatus";
import PinGpsBlock from "./PinGpsBlock";
import { BillButton } from "./OrderBill.jsx";
import OrderFeedbackCta from "./OrderFeedbackCta";
import { scanHref } from "./orderQr";
import {
  awaitingPartnerMessage,
  isAwaitingCustomerSlotConfirm,
  isAwaitingPartnerConfirm,
} from "./orderConfirm";
import SlotOfferCard from "./SlotOfferCard";
import { rxShareCardStyles } from "./RxShareCard";
import OrderFullView from "./OrderFullView.jsx";
import OrderListTable from "./OrderListTable.jsx";
import {
  isDiagnosticKind,
  mergeOrderReportIntoStore,
} from "./labPipeline";

function typeLabel(order) {
  return kindLabel(order?.kind || order?.orderType);
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const needsSlot = selectedOrder && isAwaitingCustomerSlotConfirm(selectedOrder);
    const needsRx = Boolean(selectedOrder?.rxShare?.digital?.medicines?.length);
    if (!needsSlot && !needsRx) {
      return undefined;
    }
    const id = selectedOrder.bookingId || selectedOrder.id;
    let cancelled = false;
    const timer = setInterval(async () => {
      const latest = await refreshOrderFromServer(id);
      if (!cancelled && latest) handleSelectedChange(latest);
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedOrder?.id, selectedOrder?.bookingId, selectedOrder?.slotConfirmStatus]);

  useEffect(() => {
    const rows = loadAllOrders();
    setOrders(rows);
    rows.forEach((order) => {
      if (isDiagnosticKind(order?.kind || order?.orderType) && order?.reportFileData) {
        mergeOrderReportIntoStore(order);
      }
    });
  }, []);

  const handleSelectedChange = (next) => {
    setSelectedOrder(next);
    setOrders((current) =>
      current.map((order) => (String(order.id) === String(next.id) ? next : order))
    );
  };

  const markDone = () => {
    if (!selectedOrder || selectedOrder.trackCompleted) return;
    const next = persistOrder(selectedOrder, {
      trackCompleted: true,
      trackStatus: "done",
      partnerLat: selectedOrder.destLat,
      partnerLng: selectedOrder.destLng,
      status: selectedOrder.kind === "medicine" ? "Delivered" : "Completed",
    });
    handleSelectedChange(next);
  };

  return (
    <div className="my-orders-pag my-orders-page">
      <style>{rxShareCardStyles}</style>
      <div className="orders-page-header">
        <div>
          <span className="orders-eyebrow">ACCOUNT</span>
          <h1>My Orders</h1>
          <p className="orders-subtitle">
            Medicines, diagnostics, Home Care, psychologist, and ambulance — all
            with live PIN tracking.
          </p>
        </div>
        <div className="orders-header-actions">
          <a className="orders-nav-btn" href="#vaccination">
            Vaccination Record
          </a>
          {selectedOrder ? (
            <button
              type="button"
              className="orders-nav-btn orders-nav-orders"
              onClick={() => setSelectedOrder(null)}
            >
              Back to Orders
            </button>
          ) : null}
        </div>
      </div>

      {selectedOrder && (
        <div className="order-details-page">
          <h2>Order Details</h2>

          <p>
            <strong>Order ID:</strong> #{selectedOrder.id}
          </p>

          <p>
            <strong>Date:</strong> {selectedOrder.date}
          </p>

          <p>
            <strong>Status:</strong> {orderCurrentStatus(selectedOrder)}
          </p>
          <p>
            <strong>Type:</strong> {typeLabel(selectedOrder)}
          </p>

          {isAwaitingCustomerSlotConfirm(selectedOrder) ? (
            <SlotOfferCard
              order={selectedOrder}
              onResolved={handleSelectedChange}
            />
          ) : isAwaitingPartnerConfirm(selectedOrder) ? (
            <p className="lab-hint" role="status">
              {awaitingPartnerMessage(selectedOrder.kind || selectedOrder.orderType)}
            </p>
          ) : (
            <LiveTrackingPanel
              order={selectedOrder}
              onOrderChange={handleSelectedChange}
              compact
            />
          )}

          <OrderFullView order={selectedOrder} audience="customer" />
          {selectedOrder.partnerConfirmed &&
          !selectedOrder.paid &&
          (selectedOrder.paymentStatus === "awaiting_payment" ||
            selectedOrder.paymentMethod === "pending") ? (
            <p className="lab-hint" role="status">
              {selectedOrder.kind === "lab" || selectedOrder.kind === "radiology" ? (
                <>
                  Booking confirmed.{" "}
                  <a href="#labs">Open Lab Tests</a> to pay, or track from here.
                </>
              ) : (
                "Booking confirmed. Complete payment or track live from the buttons below."
              )}
            </p>
          ) : null}
          <div className="order-details-address">
            <PinGpsBlock record={selectedOrder} compact />
          </div>
          <div className="order-action-buttons">
            <BillButton order={selectedOrder} className="order-details-btn" />
            <a className="order-details-btn" href={trackHref(selectedOrder.id)}>
              Open full live track
            </a>
            <a
              className="order-details-btn"
              href={scanHref({ id: selectedOrder.id, step: "deliver", order: selectedOrder })}
            >
              Scan Delivery
            </a>
            {selectedOrder.ambulanceRequestId ? (
              <a
                className="order-details-btn"
                href={trackHref(selectedOrder.ambulanceRequestId)}
              >
                Track ambulance
              </a>
            ) : null}
            <OrderFeedbackCta order={selectedOrder} />
            {!selectedOrder.trackCompleted && selectedOrder.destLat != null && (
              <button className="order-details-btn" type="button" onClick={markDone}>
                Mark {selectedOrder.kind === "medicine" ? "delivered" : "completed"}
              </button>
            )}
            <button
              className="order-back-btn"
              type="button"
              onClick={() => setSelectedOrder(null)}
            >
              Back to My Orders
            </button>
          </div>
        </div>
      )}

      {!selectedOrder &&
        (orders.length === 0 ? (
          <div className="orders-empty">
            <p>No orders found yet.</p>
            <p>
              Place a medicine order, book diagnostics, home care, vaccination,
              a psychologist session, or step-down care, or request an ambulance to track it here.
            </p>
            <div className="orders-empty-actions">
              <a href="#medicine-search">Order medicines</a>
              <a href="#labs">Book diagnostics</a>
              <a href="#homecare">Book home care</a>
              <a href="#homecare?service=nurse&plan=vaccination">Book nurse vaccination</a>
              <a href="#doctor">Book a doctor</a>
              <a href="#psychologist">Book a psychologist</a>
              <a href="#stepdown">Find a step-down centre</a>
              <a href="#ambulance">Request ambulance</a>
            </div>
          </div>
        ) : (
          <OrderListTable
            orders={orders}
            audience="customer"
            empty="No orders found yet."
            onOpen={(_id, order) => setSelectedOrder(order)}
          />
        ))}
    </div>
  );
}

export default MyOrders;
