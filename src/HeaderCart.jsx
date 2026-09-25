import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { goToHash } from "./hashRoute";
import {
  CART_OPEN_EVENT,
  MEDICINE_CART_EVENT,
  TEST_CART_EVENT,
  openShopCart,
  readMedicineCart,
  readTestCart,
  removeMedicineFromCart,
  removeTestFromCart,
  shopCartCount,
  updateMedicineBatch,
  updateMedicineQuantity,
} from "./medicineCartStore";
import MedicineBatchPick from "./MedicineBatchPick.jsx";

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.2 6.5h14.1l-1.4 7.2a1.8 1.8 0 0 1-1.8 1.5H9.1a1.8 1.8 0 0 1-1.8-1.4L5.2 4.2H3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.4" fill="currentColor" />
      <circle cx="17.2" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

function groupTests(tests) {
  const groups = [];
  const index = new Map();
  for (const test of tests) {
    const key = `${test.kind || "lab"}:${test.partnerId}`;
    if (!index.has(key)) {
      const group = {
        key,
        kind: test.kind || "lab",
        partnerId: test.partnerId,
        partnerName: test.partnerName || "Partner lab",
        items: [],
      };
      index.set(key, group);
      groups.push(group);
    }
    index.get(key).items.push(test);
  }
  return groups;
}

function money(value) {
  return `₹${Number(value || 0)}`;
}

export default function HeaderCart({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [medicines, setMedicines] = useState(() => readMedicineCart());
  const [tests, setTests] = useState(() => readTestCart());
  const [count, setCount] = useState(() => shopCartCount());

  useEffect(() => {
    const sync = () => {
      setMedicines(readMedicineCart());
      setTests(readTestCart());
      setCount(shopCartCount());
    };
    const onOpen = () => {
      sync();
      setOpen(true);
    };
    window.addEventListener(CART_OPEN_EVENT, onOpen);
    window.addEventListener(MEDICINE_CART_EVENT, sync);
    window.addEventListener(TEST_CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_OPEN_EVENT, onOpen);
      window.removeEventListener(MEDICINE_CART_EVENT, sync);
      window.removeEventListener(TEST_CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const testGroups = useMemo(() => groupTests(tests), [tests]);
  const testTotal = tests.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const medicineTotal = medicines.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || 1),
    0
  );

  const close = () => setOpen(false);

  const checkout = () => {
    if (!medicines.length && !tests.length) return;
    close();
    goToHash("#checkout");
  };

  const drawer =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="shop-cart-overlay" role="presentation">
            <button
              type="button"
              className="shop-cart-backdrop"
              aria-label="Close cart"
              onClick={close}
            />
            <div
              className="shop-cart-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-cart-title"
            >
              <header className="shop-cart-head">
                <div>
                  <p className="shop-cart-kicker">MediHome</p>
                  <h2 id="shop-cart-title">Your cart</h2>
                </div>
                <button
                  type="button"
                  className="shop-cart-close"
                  aria-label="Close cart"
                  onClick={close}
                >
                  ×
                </button>
              </header>

              <div className="shop-cart-split">
                <section className="shop-cart-col is-tests" aria-label="Tests in cart">
                  <div className="shop-cart-col-head">
                    <h3>Tests</h3>
                    <span>
                      {tests.length
                        ? `${tests.length} · ${money(testTotal)}`
                        : "None yet"}
                    </span>
                  </div>
                  {tests.length === 0 ? (
                    <p className="shop-cart-empty">No tests added yet.</p>
                  ) : (
                    testGroups.map((group) => (
                      <div className="shop-cart-group" key={group.key}>
                        <p className="shop-cart-partner">
                          {group.partnerName}
                          <em>
                            {group.kind === "radiology" ? "Imaging" : "Lab"}
                          </em>
                        </p>
                        {group.items.map((test) => (
                          <div className="shop-cart-row" key={testCartLine(test)}>
                            <div>
                              <strong>{test.name}</strong>
                              <span>{money(test.price)}</span>
                            </div>
                            <button
                              type="button"
                              className="shop-cart-remove"
                              onClick={() =>
                                removeTestFromCart(test.id, test.partnerId)
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </section>

                <section
                  className="shop-cart-col is-meds"
                  aria-label="Medicines in cart"
                >
                  <div className="shop-cart-col-head">
                    <h3>Medicines</h3>
                    <span>
                      {medicines.length
                        ? `${medicines.reduce(
                            (sum, item) => sum + (item.quantity || 1),
                            0
                          )} · ${money(medicineTotal)}`
                        : "None yet"}
                    </span>
                  </div>
                  {medicines.length === 0 ? (
                    <p className="shop-cart-empty">No medicines added yet.</p>
                  ) : (
                    medicines.map((item) => (
                      <div className="shop-cart-row" key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {money(item.price)} × {item.quantity || 1} ={" "}
                            {money(item.price * (item.quantity || 1))}
                          </span>
                          <MedicineBatchPick
                            item={item}
                            onChange={(next) => updateMedicineBatch(item.id, next)}
                          />
                        </div>
                        <div className="shop-cart-qty">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.name}`}
                            onClick={() =>
                              updateMedicineQuantity(
                                item.id,
                                (item.quantity || 1) - 1
                              )
                            }
                          >
                            −
                          </button>
                          <span>{item.quantity || 1}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${item.name}`}
                            onClick={() =>
                              updateMedicineQuantity(
                                item.id,
                                (item.quantity || 1) + 1
                              )
                            }
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="shop-cart-remove"
                            onClick={() => removeMedicineFromCart(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              </div>

              <footer className="shop-cart-foot">
                <p>
                  Total {money(testTotal + medicineTotal)}
                  {tests.length && medicines.length
                    ? ` · tests ${money(testTotal)} · medicines ${money(medicineTotal)}`
                    : ""}
                </p>
                <div className="shop-cart-actions">
                  <button
                    type="button"
                    className="cart-btn cart-btn-primary"
                    disabled={!medicines.length && !tests.length}
                    onClick={checkout}
                  >
                    Checkout
                  </button>
                </div>
              </footer>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`shop-cart-slot${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="shop-cart-btn"
        aria-label={count ? `Open cart, ${count} items` : "Open cart"}
        onClick={() => (open ? close() : openShopCart())}
      >
        <span className="shop-cart-icon">
          <CartIcon />
          {count > 0 ? <span className="shop-cart-badge">{count}</span> : null}
        </span>
        <span className="shop-cart-label">Cart</span>
      </button>
      {drawer}
    </div>
  );
}

function testCartLine(test) {
  return `${test.kind || "lab"}:${test.partnerId}:${test.id}`;
}
