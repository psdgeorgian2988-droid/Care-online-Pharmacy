import { useEffect, useState } from "react";
import { LiveTrackingPanel } from "./LiveTracking";
import {
  kindLabel,
  loadAllOrders,
  persistOrder,
  trackHref,
} from "./orderTracking";
import PinGpsBlock from "./PinGpsBlock";
import { BillButton } from "./OrderBill";
import OrderFeedbackCta from "./OrderFeedbackCta";
import { paymentMethodSummary } from "./paymentMethods";
import { maskMobile } from "./personFields";

function typeLabel(order) {
  return kindLabel(order?.kind || order?.orderType);
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    setOrders(loadAllOrders());
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
          <a className="orders-nav-btn orders-nav-home" href="#home">
            Back to Home
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
            <strong>Status:</strong> {selectedOrder.status}
          </p>
          <p>
            <strong>Type:</strong> {typeLabel(selectedOrder)}
          </p>

          <LiveTrackingPanel
            order={selectedOrder}
            onOrderChange={handleSelectedChange}
            compact
          />

          <h3>
            {selectedOrder.kind === "lab"
              ? "Laboratory Tests"
              : selectedOrder.kind === "radiology"
                ? "Imaging Studies"
                : selectedOrder.kind === "homecare"
                  ? "Home Care"
                  : selectedOrder.kind === "vaccination"
                    ? "Vaccination"
                    : selectedOrder.kind === "psychologist"
                    ? "Psychologist Consultation"
                    : selectedOrder.kind === "stepdown"
                      ? "Step-Down Care"
                      : selectedOrder.kind === "ambulance"
                        ? "Request"
                        : "Medicines"}
          </h3>

          <ul>
            {selectedOrder.items?.map((item, index) => (
              <li key={index}>
                {item.name}
                {item.quantity ? ` × ${item.quantity}` : ""}
                {item.price ? ` — ₹${item.price}` : ""}
              </li>
            ))}
          </ul>
          <div className="order-details-address">
            {(selectedOrder.kind === "lab" || selectedOrder.kind === "radiology") && (
              <>
                <p>
                  <strong>
                    {selectedOrder.kind === "lab" ? "Lab Partner" : "Imaging Partner"}:
                  </strong>{" "}
                  {selectedOrder.partner || "Not provided"}
                </p>
                <p>
                  <strong>Patient:</strong>{" "}
                  {selectedOrder.patientName || "Not provided"}
                </p>
                <p>
                  <strong>Mobile:</strong>{" "}
                  {maskMobile(selectedOrder.mobile) || "Not provided"}
                </p>
                <p>
                  <strong>
                    {selectedOrder.kind === "lab" ? "Collection Type" : "Appointment Type"}:
                  </strong>{" "}
                  {selectedOrder.visitType === "home" ? "Home Collection" : "Centre Visit"}
                </p>
                <p>
                  <strong>Appointment Date:</strong>{" "}
                  {selectedOrder.appointmentDate || selectedOrder.date || "Not provided"}
                </p>
                <p>
                  <strong>Time Slot:</strong>{" "}
                  {selectedOrder.timeSlot || "Not provided"}
                </p>
              </>
            )}
            {selectedOrder.kind === "homecare" && (
              <>
                <p>
                  <strong>Patient:</strong>{" "}
                  {selectedOrder.patientName || "Not provided"}
                </p>
                <p>
                  <strong>Visit date:</strong> {selectedOrder.date || "Not provided"}
                </p>
                <p>
                  <strong>Time slot:</strong> {selectedOrder.timeSlot || "Not provided"}
                </p>
                <p>
                  <strong>Plan:</strong> {selectedOrder.carePlanLabel || "Not provided"}
                </p>
                <p>
                  <strong>Charges:</strong>{" "}
                  {selectedOrder.total != null
                    ? `₹${Number(selectedOrder.total).toLocaleString("en-IN")}`
                    : "Not provided"}
                </p>
              </>
            )}
            {selectedOrder.kind === "psychologist" && (
              <>
                <p>
                  <strong>Patient:</strong>{" "}
                  {selectedOrder.patientName || "Not provided"}
                </p>
                <p>
                  <strong>Session:</strong> {selectedOrder.carePlanLabel || "Not provided"}
                </p>
                <p>
                  <strong>Mode:</strong>{" "}
                  {selectedOrder.sessionMode === "home" ? "Home visit" : "Video"}
                </p>
                <p>
                  <strong>Session date:</strong> {selectedOrder.date || "Not provided"}
                </p>
                <p>
                  <strong>Time slot:</strong> {selectedOrder.timeSlot || "Not provided"}
                </p>
                {selectedOrder.concern ? (
                  <p>
                    <strong>Note:</strong> {selectedOrder.concern}
                  </p>
                ) : null}
                <p>
                  <strong>Charges:</strong>{" "}
                  {selectedOrder.total != null
                    ? `₹${Number(selectedOrder.total).toLocaleString("en-IN")}`
                    : "Not provided"}
                </p>
              </>
            )}
            {selectedOrder.kind === "stepdown" && (
              <>
                <p>
                  <strong>Centre:</strong>{" "}
                  {selectedOrder.centreName || "Not provided"}
                </p>
                <p>
                  <strong>Patient:</strong>{" "}
                  {selectedOrder.patientName || "Not provided"}
                </p>
                <p>
                  <strong>Start date:</strong> {selectedOrder.date || "Not provided"}
                </p>
                <p>
                  <strong>Time slot:</strong> {selectedOrder.timeSlot || "Not provided"}
                </p>
                <p>
                  <strong>Days:</strong> {selectedOrder.durationDays || "Not provided"}
                </p>
                <p>
                  <strong>Ambulance to centre:</strong>{" "}
                  {selectedOrder.needAmbulance ? "Yes (booked automatically)" : "No"}
                </p>
                {selectedOrder.ambulanceRequestId ? (
                  <p>
                    <strong>Ambulance ID:</strong> {selectedOrder.ambulanceRequestId}
                  </p>
                ) : null}
              </>
            )}
            {selectedOrder.kind === "ambulance" && (
              <>
                <p>
                  <strong>Patient:</strong>{" "}
                  {selectedOrder.patientName || "Not provided"}
                </p>
                <p>
                  <strong>Type:</strong>{" "}
                  {selectedOrder.emergencyType === "emergency"
                    ? "Emergency"
                    : "Non-emergency"}
                </p>
                {selectedOrder.destinationName ? (
                  <p>
                    <strong>Drop at:</strong> {selectedOrder.destinationName}
                    {selectedOrder.destinationAddress
                      ? ` · ${selectedOrder.destinationAddress}`
                      : ""}
                    {selectedOrder.destinationFacilities
                      ? ` · ${selectedOrder.destinationFacilities}`
                      : ""}
                  </p>
                ) : null}
              </>
            )}
            <p>
              <strong>
                {selectedOrder.kind === "ambulance" ? "Pickup Address" : "Address"}:
              </strong>{" "}
              {selectedOrder.deliveryAddress || "Not provided"}
            </p>

            <p>
              <strong>PIN Code:</strong> {selectedOrder.pinCode || "Not provided"}
            </p>
            {selectedOrder.outletName ? (
              <p>
                <strong>Delivery outlet:</strong> {selectedOrder.outletName}
                {selectedOrder.outletArea ? ` · ${selectedOrder.outletArea}` : ""}
              </p>
            ) : null}
            {selectedOrder.kind === "medicine" && (selectedOrder.outletGstin || selectedOrder.outletDlNo) ? (
              <>
                {selectedOrder.outletGstin ? (
                  <p>
                    <strong>Outlet GSTIN:</strong> {selectedOrder.outletGstin}
                  </p>
                ) : null}
                {selectedOrder.outletDlNo ? (
                  <p>
                    <strong>Outlet DL No.:</strong> {selectedOrder.outletDlNo}
                  </p>
                ) : null}
              </>
            ) : null}
            {(selectedOrder.kind === "lab" || selectedOrder.kind === "radiology") &&
            (selectedOrder.partnerGstin || selectedOrder.partnerDlNo) ? (
              <>
                {selectedOrder.partnerGstin ? (
                  <p>
                    <strong>Partner GSTIN:</strong> {selectedOrder.partnerGstin}
                  </p>
                ) : null}
                {selectedOrder.partnerDlNo ? (
                  <p>
                    <strong>
                      {selectedOrder.kind === "lab" ? "Lab licence:" : "Centre licence:"}
                    </strong>{" "}
                    {selectedOrder.partnerDlNo}
                  </p>
                ) : null}
              </>
            ) : null}
            {selectedOrder.paymentMethod ? (
              <p>
                <strong>Payment:</strong>{" "}
                {paymentMethodSummary(
                  selectedOrder.paymentMethod,
                  "Cash on delivery / visit"
                )}
              </p>
            ) : null}
            <PinGpsBlock record={selectedOrder} compact />
            {selectedOrder.kind === "medicine" && (
              <p>
                <strong>Prescription:</strong>{" "}
                {selectedOrder.prescription || "Not provided"}
              </p>
            )}
          </div>
          {selectedOrder.total != null && selectedOrder.total !== "" && (
            <p className="order-details-total">
              <strong>Total:</strong> ₹{selectedOrder.total}
            </p>
          )}
          <div className="order-action-buttons">
            <BillButton order={selectedOrder} className="order-details-btn" />
            <a className="order-details-btn" href={trackHref(selectedOrder.id)}>
              Open full live track
            </a>
            <a
              className="order-details-btn"
              href={`#scan?id=${encodeURIComponent(selectedOrder.id)}`}
            >
              Scan QR
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
              <a href="#psychologist">Book a psychologist</a>
              <a href="#stepdown">Find a step-down centre</a>
              <a href="#ambulance">Request ambulance</a>
            </div>
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map((order) => (
              <div key={`${order.kind}-${order.id}`} className="order-chip">
                <button
                  type="button"
                  className="order-chip-id"
                  onClick={() => setSelectedOrder(order)}
                >
                  #{order.id}
                </button>
                <div className="order-chip-tip">
                  <p>
                    <strong>Type:</strong> {typeLabel(order)}
                  </p>
                  <p>
                    <strong>Date:</strong> {order.date || "Not provided"}
                  </p>
                  <p>
                    <strong>Items:</strong>{" "}
                    {order.items?.map((item) => item.name).join(", ") || "—"}
                  </p>
                  {order.total != null && order.total !== "" ? (
                    <p>
                      <strong>Total:</strong> ₹{order.total}
                    </p>
                  ) : null}
                  <p>
                    <strong>PIN:</strong> {order.pinCode || "Add PIN to track"}
                  </p>
                  {order.outletName ? (
                    <p>
                      <strong>Outlet:</strong> {order.outletName}
                    </p>
                  ) : null}
                  {order.paymentMethod ? (
                    <p>
                      <strong>Payment:</strong>{" "}
                      {paymentMethodSummary(
                        order.paymentMethod,
                        "Cash on delivery"
                      )}
                    </p>
                  ) : null}
                  <p>
                    <strong>Status:</strong> {order.status}
                  </p>
                  <div className="order-chip-tip-actions">
                    <button
                      className="order-details-btn"
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View Details
                    </button>
                    <BillButton order={order} className="order-details-btn" />
                    <a className="order-track-btn" href={trackHref(order.id)}>
                      Track live
                    </a>
                    <a
                      className="order-track-btn"
                      href={`#scan?id=${encodeURIComponent(order.id)}`}
                    >
                      Scan QR
                    </a>
                    {order.trackCompleted ? (
                      <OrderFeedbackCta order={order} />
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

export default MyOrders;
