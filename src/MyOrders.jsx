import { useEffect, useState } from "react";

function MyOrders() {
  const [orders, setOrders] = useState([]);
const [selectedOrder, setSelectedOrder] = useState(null);
const statusSteps = [
  "Order Placed",
  "Prescription Verified",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
];

const currentStep = statusSteps.indexOf(selectedOrder?.status) + 1;
const updateOrderStatus = (newStatus) => {
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

  localStorage.setItem(
    "mediHomeOrders",
    JSON.stringify(updatedOrders)
  );
};
  useEffect(() => {
    const savedOrders = JSON.parse(
      localStorage.getItem("mediHomeOrders") || "[]"
    );

    setOrders(savedOrders);
  }, []);

  return (
    <div className="my-orders-pag">
      <h1>My Orders</h1>
{selectedOrder && (
<div className="order-details-page">    <h2>Order Details</h2>

    <p>
      <strong>Order ID:</strong> #{selectedOrder.id}
    </p>

    <p>
      <strong>Date:</strong> {selectedOrder.date}
    </p>

    <p>
      <strong>Status:</strong> {selectedOrder.status}
    </p>
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
    <h3>Medicines</h3>

    <ul>
      {selectedOrder.items?.map((item, index) => (
        <li key={index}>
          {item.name}
          {item.quantity ? ` × ${item.quantity}` : ""}
        </li>
      ))}
    </ul>
<div className="order-details-address">
  <p>
    <strong>Delivery Address:</strong>{" "}
    {selectedOrder.deliveryAddress || "Not provided"}
  </p>

  <p>
    <strong>PIN Code:</strong>{" "}
    {selectedOrder.pinCode || "Not provided"}
  </p>
</div>
    <p className="order-details-total">
      <strong>Total:</strong> ₹{selectedOrder.total}
    </p>
{currentStep < statusSteps.length && (
  <button
    className="order-details-btn"
    onClick={() => updateOrderStatus(statusSteps[currentStep])}
  >
    Next Status: {statusSteps[currentStep]}
  </button>
)}
    <div
  className="order-action-buttons"
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  }}
>
  

  <button
    className="order-back-btn"
    onClick={() => setSelectedOrder(null)}
  >
    Back to My Orders
  </button>
</div>
  </div>
)}
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="orders-grid">
      {orders.map((order) => (
  <div key={order.id} className="order-card">
    <div className="order-card-header">
      <h3>Order #{order.id}</h3>
      <span className="order-status">{order.status}</span>
    </div>

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
onClick={() => setSelectedOrder(order)}>
    View Details
</button>
    
  </div>
))}
      
      </div>
      )}
  </div>
  );
}
export default MyOrders;