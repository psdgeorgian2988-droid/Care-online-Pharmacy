import { useEffect, useState } from "react";

function MyOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const savedOrders = JSON.parse(
      localStorage.getItem("medihomeOrders") || "[]"
    );

    setOrders(savedOrders);
  }, []);

  return (
    <div className="page">
      <h1>My Orders</h1>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-card">
            <h3>Order #{order.id}</h3>
            <p>Date: {order.date}</p>
            <p>Status: {order.status}</p>
            <p>Total: ₹{order.total}</p>

            <p>
              Items:{" "}
              {order.items
                ?.map((item) => item.name)
                .join(", ")}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export default MyOrders;