import { useState } from "react";

function readSavedProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return {
      name: String(parsed.name || parsed.fullName || "").trim(),
      mobile: String(parsed.mobile || parsed.mobileNumber || "").trim(),
      address: String(parsed.address || parsed.deliveryAddress || "").trim(),
      pinCode: String(parsed.pinCode || parsed.pincode || "").trim(),
    };
  } catch {
    return null;
  }
}

const medicines = [
  {
    id: 1,
    name: "Metformin 500 mg",
    salt: "Metformin",
    strength: "500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 50,
    price: 45,
    prescription: true,
  },
  {
    id: 2,
    name: "Metformin 500 mg + Glimepiride 1 mg",
    salt: "Metformin + Glimepiride",
    strength: "500 mg + 1 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 95,
    price: 85,
    prescription: true,
  },
  {
    id: 3,
    name: "Telmisartan 40 mg",
    salt: "Telmisartan",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 40,
    price: 35,
    prescription: true,
  },
  {
    id: 4,
    name: "Amlodipine 5 mg",
    salt: "Amlodipine",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 45,
    price: 40,
    prescription: true,
  },
  {
    id: 5,
    name: "Atorvastatin 10 mg",
    salt: "Atorvastatin",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 65,
    price: 55,
    prescription: true,
  },
  {
    id: 6,
    name: "Vitamin D3",
    salt: "Cholecalciferol",
    strength: "As applicable",
    packSize: "10 tablets",
    category: "Supplements",
    mrp: 140,
    price: 120,
    prescription: false,
  },
];

const requiresPrescription = (medicine) =>
  Boolean(medicine.prescription || medicine.prescriptionRequired);

function Medicines() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [recentSearches, setRecentSearches] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const savedProfile = readSavedProfile();
  const [fullName, setFullName] = useState(savedProfile?.name || "");
  const [mobileNumber, setMobileNumber] = useState(savedProfile?.mobile || "");
  const [deliveryAddress, setDeliveryAddress] = useState(
    savedProfile?.address || ""
  );
  const [pinCode, setPinCode] = useState(savedProfile?.pinCode || "");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const handleMedicineSearch = () => {
    const value = search.trim();
    setCategory("All");

    if (value !== "") {
      setRecentSearches((previous) => {
        const updated = [
          value,
          ...previous.filter(
            (item) => item.toLowerCase() !== value.toLowerCase()
          ),
        ];

        return updated.slice(0, 5);
      });
    }
  };

  const categories = [
    "All",
    "Diabetes",
    "Hypertension",
    "Cholesterol",
    "Cardiology",
    "Thyroid",
    "Kidney Care",
    "Respiratory",
    "Bone & Joint",
    "Supplements",
  ];

  const filteredMedicines = medicines.filter((medicine) => {
    const searchText = search.trim().toLowerCase();

    const medicineName = (medicine.name || "").toLowerCase();
    const medicineSalt = (medicine.salt || "").toLowerCase();

    const matchesSearch =
      searchText === "" ||
      medicineName.includes(searchText) ||
      medicineSalt.includes(searchText);

    const matchesCategory =
      category === "All" || medicine.category === category;

    return matchesSearch && matchesCategory;
  });

  const cartCount = cart.reduce(
    (total, item) => total + (item.quantity || 1),
    0
  );

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * (item.quantity || 1),
    0
  );

  const cartNeedsPrescription = cart.some(requiresPrescription);

  const addToCart = (medicine) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === medicine.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === medicine.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }

      return [...currentCart, { ...medicine, quantity: 1 }];
    });
    setShowCart(true);
    setConfirmedOrder(null);
  };

  const increaseQuantity = (medicineId) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === medicineId
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (medicineId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === medicineId
            ? { ...item, quantity: (item.quantity || 1) - 1 }
            : item
        )
        .filter((item) => (item.quantity || 1) > 0)
    );
  };

  const removeFromCart = (medicineId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== medicineId)
    );
  };

  const resetCheckoutForm = () => {
    setFullName("");
    setMobileNumber("");
    setDeliveryAddress("");
    setPinCode("");
    setPrescriptionFile(null);
  };

  const placeOrder = () => {
    if (cart.length === 0) {
      alert("Your cart is empty. Please add a medicine before checkout.");
      return;
    }

    if (!fullName.trim()) {
      alert("Please enter your Full Name.");
      return;
    }

    if (!mobileNumber.trim()) {
      alert("Please enter your Mobile Number.");
      return;
    }

    if (!deliveryAddress.trim()) {
      alert("Please enter your Delivery Address.");
      return;
    }

    if (pinCode.length !== 6) {
      alert("Please enter a valid 6-digit PIN Code.");
      return;
    }

    if (cartNeedsPrescription && !prescriptionFile) {
      alert("Please upload your prescription.");
      return;
    }

    const existingOrders = JSON.parse(
      localStorage.getItem("mediHomeOrders") || "[]"
    );

    const newOrder = {
      id: Date.now(),
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        salt: item.salt,
        strength: item.strength,
        packSize: item.packSize,
        category: item.category,
        price: item.price,
        mrp: item.mrp,
        prescription: requiresPrescription(item),
        quantity: item.quantity || 1,
      })),
      total: cartTotal,
      status: "Order Placed",
      date: new Date().toLocaleString(),
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      prescription: prescriptionFile ? prescriptionFile.name : "",
      deliveryAddress: deliveryAddress.trim(),
      pinCode,
    };

    localStorage.setItem(
      "mediHomeOrders",
      JSON.stringify([...existingOrders, newOrder])
    );

    setCart([]);
    setShowCart(false);
    setShowCheckout(false);
    resetCheckoutForm();
    setConfirmedOrder(newOrder);
  };

  return (
    <section id="medicines" className="medicines-page">
      <div className="medicines-header">
        <h1>Order Medicines</h1>

        <p>Get your medicines conveniently delivered to your doorstep.</p>
        <div className="medicine-category-boxes">
          {categories.map((item) => (
            <button
              key={item}
              className={`medicine-category-box ${
                category === item ? "active" : ""
              }`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="medicine-search-box">
          <input
            type="text"
            placeholder="Search medicine by name or salt"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleMedicineSearch();
              }
            }}
          />

          <button
            type="button"
            className="medicine-search-button"
            onClick={handleMedicineSearch}
          >
            Search Medicine
          </button>

          {search.trim() !== "" && (
            <button
              type="button"
              className="medicine-clear-button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div
          className="cart-box"
          onClick={() => {
            setShowCart(true);
            setShowCheckout(false);
            setConfirmedOrder(null);
          }}
        >
          🛒 Cart: {cartCount}
        </div>
      </div>

      {showCart && (
        <div className="cart-panel">
          <h2>🛒 Your Cart</h2>

          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-info">
                  <span>{item.name}</span>
                  <span>
                    ₹{item.price} × {item.quantity || 1} = ₹
                    {item.price * (item.quantity || 1)}
                  </span>
                </div>
                <div className="cart-item-actions">
                  <button
                    type="button"
                    onClick={() => decreaseQuantity(item.id)}
                  >
                    −
                  </button>
                  <span>{item.quantity || 1}</span>
                  <button
                    type="button"
                    onClick={() => increaseQuantity(item.id)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="cart-remove-button"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}

          <h3>Total: ₹{cartTotal}</h3>

          <button type="button" onClick={() => setShowCart(false)}>
            Continue Shopping
          </button>

          <button
            type="button"
            onClick={() => {
              if (cart.length === 0) {
                alert("Your cart is empty. Please add a medicine before checkout.");
                return;
              }
              setShowCart(false);
              setShowCheckout(true);
              setConfirmedOrder(null);
              const profile = readSavedProfile();
              if (profile) {
                setFullName((current) => current || profile.name);
                setMobileNumber((current) => current || profile.mobile);
                setDeliveryAddress((current) => current || profile.address);
                setPinCode((current) => current || profile.pinCode);
              }
            }}
          >
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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Mobile Number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
          />

          {cartNeedsPrescription && (
            <div>
              <label>Prescription</label>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPrescriptionFile(e.target.files[0])}
              />

              {prescriptionFile && <p>Selected: {prescriptionFile.name}</p>}
            </div>
          )}

          <div>
            <label>Delivery Address</label>

            <textarea
              placeholder="Delivery Address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={3}
            />
            <label>PIN Code</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit PIN Code"
              value={pinCode}
              maxLength={6}
              onChange={(e) =>
                setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>
          <button type="button" onClick={placeOrder}>
            Place Order
          </button>
        </div>
      )}

      {confirmedOrder && (
        <div className="checkout-panel">
          <h2>Order Confirmed</h2>
          <p>
            Thank you, {confirmedOrder.fullName}. Your order has been placed
            successfully.
          </p>
          <p>
            <strong>Order ID:</strong> #{confirmedOrder.id}
          </p>
          <p>
            <strong>Total:</strong> ₹{confirmedOrder.total}
          </p>
          <p>
            <strong>Delivery Address:</strong> {confirmedOrder.deliveryAddress},{" "}
            {confirmedOrder.pinCode}
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              window.location.hash = "#myorders";
            }}
          >
            View My Orders
          </button>
          <button type="button" onClick={() => setConfirmedOrder(null)}>
            Continue Shopping
          </button>
        </div>
      )}

      {category === "All" && search.trim() === "" && !showCart && !showCheckout && !confirmedOrder && (
        <div className="medicines-empty-hint">
          <p>Select a category or search by medicine name or salt to browse the catalogue.</p>
        </div>
      )}

      {((category && category !== "All") || search.trim() !== "") && (
        <div className="medicine-grid">
          {filteredMedicines.length === 0 ? (
            <p className="medicines-empty-hint">No medicines match your search.</p>
          ) : (
          filteredMedicines.map((medicine) => (
            <div className="medicine-card" key={medicine.id}>
              <h3>{medicine.name}</h3>

              <p>
                <strong>Salt:</strong> {medicine.salt}
              </p>

              <p>
                <strong>Strength:</strong> {medicine.strength}
              </p>

              <p>
                <strong>Pack Size:</strong> {medicine.packSize}
              </p>

              <p>
                <strong>Category:</strong> {medicine.category}
              </p>

              {requiresPrescription(medicine) ? (
                <span className="prescription-badge">
                  📋 Prescription Required
                </span>
              ) : (
                <span className="prescription-badge">
                  ✓ No Prescription Required
                </span>
              )}

              <p>
                <span
                  style={{ textDecoration: "line-through", marginRight: "8px" }}
                >
                  MRP ₹{medicine.mrp}
                </span>
                <strong>₹{medicine.price}</strong>
              </p>
              <button type="button" onClick={() => addToCart(medicine)}>
                Add to Cart
              </button>
            </div>
          ))
          )}
        </div>
      )}
    </section>
  );
}

export default Medicines;
