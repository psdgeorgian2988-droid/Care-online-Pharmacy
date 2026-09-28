import { useEffect, useState } from "react";
import {
  isOrderCompleted,
  kindLabel,
  loadCompletedOrders,
} from "./orderTracking";
import { BillButton } from "./OrderBill";
import OrderFeedbackCta from "./OrderFeedbackCta";
import { paymentMethodSummary } from "./paymentMethods";
import { maskMobile } from "./personFields";

function typeLabel(order) {
  return kindLabel(order?.kind || order?.orderType);
}

function itemsHeading(kind) {
  switch (kind) {
    case "lab":
      return "Laboratory Tests";
    case "radiology":
      return "Imaging Studies";
    case "homecare":
      return "Home Care";
    case "vaccination":
      return "Vaccination";
    case "psychologist":
      return "Psychologist Consultation";
    case "stepdown":
      return "Step-Down Care";
    case "ambulance":
      return "Request";
    default:
      return "Medicines";
  }
}

function DetailRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <p>
      <strong>{label}:</strong> {value}
    </p>
  );
}

function OrderDetails({ order, onBack }) {
  const total =
    order.total != null && order.total !== ""
      ? `₹${Number(order.total).toLocaleString("en-IN")}`
      : "";

  return (
    <div className="order-details-page">
      <h2>Order Details</h2>
      <DetailRow label="Order ID" value={`#${order.id}`} />
      <DetailRow label="Date" value={order.date || "Not provided"} />
      <DetailRow label="Status" value={order.status || "Completed"} />
      <DetailRow label="Type" value={typeLabel(order)} />

      <h3>{itemsHeading(order.kind)}</h3>
      <ul>
        {(order.items || []).map((item, index) => (
          <li key={`${item.name || "item"}-${index}`}>
            {item.name}
            {item.quantity ? ` × ${item.quantity}` : ""}
            {item.price ? ` — ₹${item.price}` : ""}
          </li>
        ))}
      </ul>

      <div className="order-details-address">
        {(order.kind === "lab" || order.kind === "radiology") && (
          <>
            <DetailRow
              label={order.kind === "lab" ? "Lab Partner" : "Imaging Partner"}
              value={order.partner || "Not provided"}
            />
            <DetailRow label="Patient" value={order.patientName || "Not provided"} />
            <DetailRow label="Mobile" value={maskMobile(order.mobile) || "Not provided"} />
            <DetailRow
              label={order.kind === "lab" ? "Collection Type" : "Appointment Type"}
              value={order.visitType === "home" ? "Home Collection" : "Centre Visit"}
            />
            <DetailRow
              label="Appointment Date"
              value={order.appointmentDate || order.date || "Not provided"}
            />
            <DetailRow label="Time Slot" value={order.timeSlot || "Not provided"} />
            <DetailRow label="Partner GSTIN" value={order.partnerGstin || ""} />
            <DetailRow
              label={order.kind === "lab" ? "Lab licence" : "Centre licence"}
              value={order.partnerDlNo || ""}
            />
          </>
        )}

        {order.kind === "homecare" && (
          <>
            <DetailRow label="Patient" value={order.patientName || "Not provided"} />
            <DetailRow label="Visit date" value={order.date || "Not provided"} />
            <DetailRow label="Time slot" value={order.timeSlot || "Not provided"} />
            <DetailRow label="Plan" value={order.carePlanLabel || "Not provided"} />
          </>
        )}

        {order.kind === "psychologist" && (
          <>
            <DetailRow label="Patient" value={order.patientName || "Not provided"} />
            <DetailRow label="Session" value={order.carePlanLabel || "Not provided"} />
            <DetailRow
              label="Mode"
              value={order.sessionMode === "home" ? "Home visit" : "Video"}
            />
            <DetailRow label="Session date" value={order.date || "Not provided"} />
            <DetailRow label="Time slot" value={order.timeSlot || "Not provided"} />
            <DetailRow label="Note" value={order.concern || ""} />
          </>
        )}

        {order.kind === "stepdown" && (
          <>
            <DetailRow label="Centre" value={order.centreName || "Not provided"} />
            <DetailRow label="Patient" value={order.patientName || "Not provided"} />
            <DetailRow label="Start date" value={order.date || "Not provided"} />
            <DetailRow label="Time slot" value={order.timeSlot || "Not provided"} />
            <DetailRow label="Days" value={order.durationDays || "Not provided"} />
            <DetailRow
              label="Ambulance to centre"
              value={order.needAmbulance ? "Yes (booked automatically)" : "No"}
            />
            <DetailRow label="Ambulance ID" value={order.ambulanceRequestId || ""} />
          </>
        )}

        {order.kind === "ambulance" && (
          <>
            <DetailRow label="Patient" value={order.patientName || "Not provided"} />
            <DetailRow
              label="Type"
              value={
                order.emergencyType === "emergency" ? "Emergency" : "Non-emergency"
              }
            />
            <DetailRow
              label="Drop at"
              value={
                order.destinationName
                  ? [
                      order.destinationName,
                      order.destinationAddress,
                      order.destinationFacilities,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : ""
              }
            />
          </>
        )}

        <DetailRow
          label={order.kind === "ambulance" ? "Pickup Address" : "Address"}
          value={order.deliveryAddress || "Not provided"}
        />
        <DetailRow label="PIN Code" value={order.pinCode || "Not provided"} />
        <DetailRow
          label="Delivery outlet"
          value={
            order.outletName
              ? `${order.outletName}${order.outletArea ? ` · ${order.outletArea}` : ""}`
              : ""
          }
        />
        {order.kind === "medicine" ? (
          <>
            <DetailRow label="Outlet GSTIN" value={order.outletGstin || ""} />
            <DetailRow label="Outlet DL No." value={order.outletDlNo || ""} />
            <DetailRow
              label="Prescription"
              value={order.prescription || "Not provided"}
            />
          </>
        ) : null}
        {order.paymentMethod ? (
          <DetailRow
            label="Payment"
            value={paymentMethodSummary(
              order.paymentMethod,
              "Cash on delivery / visit"
            )}
          />
        ) : null}
      </div>

      {total ? (
        <p className="order-details-total">
          <strong>Total:</strong> {total}
        </p>
      ) : null}

      <div className="order-action-buttons">
        <BillButton order={order} className="order-details-btn" />
        <OrderFeedbackCta order={order} completed />
        <button className="order-back-btn" type="button" onClick={onBack}>
          Back to My Orders
        </button>
      </div>
    </div>
  );
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    setOrders(loadCompletedOrders());
  }, []);

  useEffect(() => {
    if (selectedOrder && !isOrderCompleted(selectedOrder)) {
      setSelectedOrder(null);
    }
  }, [selectedOrder]);

  return (
    <div className="my-orders-pag my-orders-page">
      <div className="orders-page-header">
        <div>
          <span className="orders-eyebrow">ACCOUNT</span>
          <h1>My Orders</h1>
          <p className="orders-subtitle">
            Completed orders only. Open an order number for full details. Active
            bookings stay under Track Order.
          </p>
        </div>
        <div className="orders-header-actions">
          <a className="orders-nav-btn" href="#track">
            Track Order
          </a>
          <a className="orders-nav-btn" href="#reports">
            Medical Records
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

      {selectedOrder ? (
        <OrderDetails order={selectedOrder} onBack={() => setSelectedOrder(null)} />
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <p>No completed orders yet.</p>
          <p>
            Active bookings appear under Track Order. After delivery or service
            completion, they move here.
          </p>
          <div className="orders-empty-actions">
            <a href="#track">Track Order</a>
            <a href="#medicine-search">Order medicines</a>
            <a href="#labs">Book diagnostics</a>
            <a href="#homecare">Book home care</a>
          </div>
        </div>
      ) : (
        <ol className="orders-number-list" aria-label="Completed orders">
          {orders.map((order, index) => (
            <li key={`${order.kind}-${order.id}`}>
              <button
                type="button"
                className="order-number-btn"
                onClick={() => setSelectedOrder(order)}
              >
                <span className="order-serial">{index + 1}.</span>
                <span className="order-number-id">#{order.id}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default MyOrders;
