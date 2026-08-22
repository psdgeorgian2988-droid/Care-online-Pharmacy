import { useEffect, useState } from "react";

const MEDICINE_STATUS_STEPS = [
  "Order Placed",
  "Prescription Verified",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
];

const isDiagnosticsOrder = (order) =>
  order?.orderType === "lab" || order?.orderType === "radiology";

function mapDiagnosticsBooking(booking) {
  return {
    ...booking,
    appointmentDate: booking.date,
    id: booking.bookingId,
    orderType: booking.serviceType,
    date: booking.bookedAt,
    status: "Booking Confirmed",
    items: booking.tests || [],
    total: booking.total,
    deliveryAddress: booking.address,
    pinCode: booking.pinCode,
  };
}

function loadAllOrders() {
  let medicineOrders = [];
  let diagnosticBookings = [];

  try {
    const savedOrders = JSON.parse(localStorage.getItem("mediHomeOrders") || "[]");
    medicineOrders = Array.isArray(savedOrders) ? savedOrders : [];
  } catch {
    medicineOrders = [];
  }

  try {
    const savedBookings = JSON.parse(
      localStorage.getItem("mediHomeDiagnosticsBookings") || "[]"
    );
    diagnosticBookings = Array.isArray(savedBookings) ? savedBookings : [];
  } catch {
    diagnosticBookings = [];
  }

  const mappedMedicine = medicineOrders.map((order) => ({
    ...order,
    orderType: "medicine",
    sortKey: Number(order.id) || 0,
  }));

  const mappedDiagnostics = diagnosticBookings.map((booking) => ({
    ...mapDiagnosticsBooking(booking),
    sortKey: booking.bookedAtMs || 0,
  }));

  return [...mappedDiagnostics, ...mappedMedicine].sort(
    (a, b) => (b.sortKey || 0) - (a.sortKey || 0)
  );
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const isDiagnostics = isDiagnosticsOrder(selectedOrder);
  const statusSteps = MEDICINE_STATUS_STEPS;
  const currentStep = statusSteps.indexOf(selectedOrder?.status) + 1;

  const updateOrderStatus = (newStatus) => {
    if (!selectedOrder || isDiagnosticsOrder(selectedOrder)) return;

    const updatedOrders = orders.map((order) =>
      order.id === selectedOrder.id
        ? { ...order, status: newStatus }
        : order
    );

    setOrders(updatedOrders);

    const updatedOrder = updatedOrders.find(
      (order) => order.id === selectedOrder.id
    );

    setSelectedOrder(updatedOrder);

    const medicineOnly = updatedOrders
      .filter((order) => !isDiagnosticsOrder(order))
      .map(({ orderType, sortKey, ...order }) => order);

    localStorage.setItem("mediHomeOrders", JSON.stringify(medicineOnly));
  };

  useEffect(() => {
    setOrders(loadAllOrders());
  }, []);

  return (
    <div className="my-orders-pag my-orders-page">
      <div className="orders-page-header">
        <div>
          <span className="orders-eyebrow">ACCOUNT</span>
          <h1>My Orders</h1>
          <p className="orders-subtitle">
            Medicine orders and diagnostic bookings in one place.
          </p>
        </div>
        <a className="orders-home-link" href="#home">
          Back to Home
        </a>
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
            <strong>Type:</strong>{" "}
            {isDiagnostics
              ? selectedOrder.orderType === "lab"
                ? "Laboratory Test"
                : "Radiology & Imaging"
              : "Medicine Order"}
          </p>
          {!isDiagnostics && (
            <div className="order-timeline">
              {statusSteps.map((step, index) => (
                <div
                  key={step}
                  className={`timeline-step ${
                    index < currentStep ? "active" : ""
                  }`}
                >
                  <span>{index < currentStep ? "✓" : index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          )}
          <h3>
            {isDiagnostics
              ? selectedOrder.orderType === "lab"
                ? "Laboratory Tests"
                : "Imaging Studies"
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
            {isDiagnostics && (
              <>
                <p>
                  <strong>
                    {selectedOrder.orderType === "lab"
                      ? "Lab Partner"
                      : "Imaging Partner"}
                    :
                  </strong>{" "}
                  {selectedOrder.partner || "Not provided"}
                </p>
                <p>
                  <strong>Patient:</strong>{" "}
                  {selectedOrder.patientName || "Not provided"}
                </p>
                <p>
                  <strong>Mobile:</strong>{" "}
                  {selectedOrder.mobile || "Not provided"}
                </p>
                <p>
                  <strong>
                    {selectedOrder.orderType === "lab"
                      ? "Collection Type"
                      : "Appointment Type"}
                    :
                  </strong>{" "}
                  {selectedOrder.visitType === "home"
                    ? "Home Collection"
                    : "Centre Visit"}
                </p>
                <p>
                  <strong>Appointment Date:</strong>{" "}
                  {selectedOrder.appointmentDate || "Not provided"}
                </p>
                <p>
                  <strong>Time Slot:</strong>{" "}
                  {selectedOrder.timeSlot || "Not provided"}
                </p>
              </>
            )}
            <p>
              <strong>{isDiagnostics ? "Address" : "Delivery Address"}:</strong>{" "}
              {selectedOrder.deliveryAddress || "Not provided"}
            </p>

            <p>
              <strong>PIN Code:</strong> {selectedOrder.pinCode || "Not provided"}
            </p>
            {!isDiagnostics && (
              <p>
                <strong>Prescription:</strong>{" "}
                {selectedOrder.prescription || "Not provided"}
              </p>
            )}
          </div>
          <p className="order-details-total">
            <strong>Total:</strong> ₹{selectedOrder.total}
          </p>
          {!isDiagnostics && currentStep < statusSteps.length && (
            <button
              className="order-details-btn"
              onClick={() => updateOrderStatus(statusSteps[currentStep])}
            >
              Next Status: {statusSteps[currentStep]}
            </button>
          )}
          <div className="order-action-buttons">
            <button
              className="order-back-btn"
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
            <p>Place a medicine order or book a lab/radiology test to see it here.</p>
            <div className="orders-empty-actions">
              <a href="#medicine-search">Order medicines</a>
              <a href="#labs">Book diagnostics</a>
            </div>
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <h3>
                    {isDiagnosticsOrder(order) ? "Booking" : "Order"} #{order.id}
                  </h3>
                  <span className="order-status">{order.status}</span>
                </div>

                <p>
                  <strong>Type:</strong>{" "}
                  {order.orderType === "lab"
                    ? "Laboratory Test"
                    : order.orderType === "radiology"
                    ? "Radiology & Imaging"
                    : "Medicine"}
                </p>

                <p>
                  <strong>Date:</strong> {order.date}
                </p>

                <p>
                  <strong>Items:</strong>{" "}
                  {order.items?.map((item) => item.name).join(", ")}
                </p>

                <p>
                  <strong>Total:</strong> ₹{order.total}
                </p>

                <button
                  className="order-details-btn"
                  onClick={() => setSelectedOrder(order)}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
export default MyOrders;
