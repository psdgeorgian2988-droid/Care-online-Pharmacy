import { useState } from "react";

const medicines = [
  {
    id: 1,
    name: "Metformin 500 mg",
    category: "Diabetes",
    price: 45,
    prescription: true,
  },
  {
    id: 2,
    name: "Metformin 500 mg + Glimepiride 1 mg",
    category: "Diabetes",
    price: 85,
    prescription: true,
  },
  {
    id: 3,
    name: "Telmisartan 40 mg",
    category: "Hypertension",
    price: 35,
    prescription: true,
  },
  {
    id: 4,
    name: "Amlodipine 5 mg",
    category: "Hypertension",
    price: 40,
    prescription: true,
  },
  {
    id: 5,
    name: "Atorvastatin 10 mg",
    category: "Cholesterol",
    price: 55,
    prescription: true,
  },
  {
    id: 6,
    name: "Vitamin D3",
    category: "Supplements",
    price: 120,
    prescription: false,
  },
];

function Medicines() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const categories = [
    "All",
    "Diabetes",
    "Hypertension",
    "Cholesterol",
    "Supplements",
  ];

  const filteredMedicines = medicines.filter((medicine) => {
    const matchesSearch = medicine.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || medicine.category === category;

    return matchesSearch && matchesCategory;
  });

  const addToCart = (medicine) => {
    setCart((currentCart) => [...currentCart, medicine]);
  };

  return (
    <section className="medicines-page">
      <div className="medicines-header">
              <h1>Order Medicines</h1>

        <p>
          Get your medicines conveniently delivered to your doorstep.
        </p>

        <div className="medicine-controls">
          <input
            type="text"
            placeholder="Search medicine"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

<div className="cart-box" onClick={() => setShowCart(true)}>
  🛒 Cart: {cart.length}
</div>

</div>
</div>

       {showCart && (
  <div className="cart-panel">
    <h2>🛒 Your Cart</h2>

    {cart.map((item, index) => (
      <div className="cart-item" key={index}>
        <span>{item.name}</span>
        <span>₹{item.price}</span>
      </div>
    ))}

    <h3>
      Total: ₹{cart.reduce((total, item) => total + item.price, 0)}
    </h3>

    <button onClick={() => setShowCart(false)}>
      Continue Shopping
    </button>

    <button onClick={() => setShowCheckout(true)}>
      Proceed to Checkout
   </button>
  </div>
)}
{showCheckout && (
  <div className="checkout-panel">
    <h2>Checkout</h2>

    <input
      type="text"
      placeholder="Full Name"
    />

    <input
      type="text"
      placeholder="Mobile Number"
    />

    <textarea
      placeholder="Delivery Address"
    />

    <button onClick={() => alert("Order placed successfully!")}>
      Place Order
    </button>

    <button onClick={() => setShowCheckout(false)}>
      Back to Cart
    </button>
  </div>
)}
<div className="medicine-grid">
{filteredMedicines.map((medicine) => (
  <div className="medicine-card" key={medicine.id}>
    <h3>{medicine.name}</h3>

    <p>Category: {medicine.category}</p>

    {medicine.prescription && (
      <span className="prescription-badge">
        📋 Prescription Required
      </span>
    )}

    <p>₹{medicine.price}</p>

    <button onClick={() => addToCart(medicine)}>
      Add to Cart
    </button>
  </div>
))}
  

</div>
</section>
);
}

export default Medicines;