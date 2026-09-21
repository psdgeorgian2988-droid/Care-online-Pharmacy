export const MEDICINE_CART_KEY = "mediHomeMedicineCart";
export const MEDICINE_CART_EVENT = "mediHomeMedicineCart";
export const CART_OPEN_EVENT = "mediHomeCartOpen";

export function openShopCart() {
  globalThis.dispatchEvent?.(new Event(CART_OPEN_EVENT));
}

export function readMedicineCart(store) {
  try {
    const raw = (store || globalThis.localStorage)?.getItem?.(MEDICINE_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeMedicineCart(cart, store) {
  try {
    (store || globalThis.localStorage)?.setItem?.(
      MEDICINE_CART_KEY,
      JSON.stringify(Array.isArray(cart) ? cart : [])
    );
    globalThis.dispatchEvent?.(new Event(MEDICINE_CART_EVENT));
  } catch {
    /* ignore */
  }
}

export function addMedicineToCart(selling, quantity = 1, store, options = {}) {
  const qty = Math.max(1, Number(quantity) || 1);
  const cart = readMedicineCart(store);
  const id = selling?.id;
  if (!id) return cart;
  const existing = cart.find((item) => item.id === id);
  const next = existing
    ? cart.map((item) =>
        item.id === id
          ? {
              ...item,
              ...selling,
              quantity: (item.quantity || 1) + qty,
              prescribedBrand: selling.prescribedBrand || item.prescribedBrand,
            }
          : item
      )
    : [...cart, { ...selling, quantity: qty }];
  writeMedicineCart(next, store);
  if (options.open !== false) openShopCart();
  return next;
}

export function updateMedicineQuantity(id, quantity, store) {
  const qty = Math.max(0, Number(quantity) || 0);
  const next =
    qty <= 0
      ? readMedicineCart(store).filter((item) => item.id !== id)
      : readMedicineCart(store).map((item) =>
          item.id === id ? { ...item, quantity: qty } : item
        );
  writeMedicineCart(next, store);
  return next;
}

export function removeMedicineFromCart(id, store) {
  const next = readMedicineCart(store).filter((item) => item.id !== id);
  writeMedicineCart(next, store);
  return next;
}

export function cartHasMedicine(id, store) {
  return readMedicineCart(store).some((item) => String(item.id) === String(id));
}

export const RX_LAB_CHECKOUT_KEY = "mediHomeRxLabCheckout";

let labCheckoutBoot;
let medicineCheckoutBoot;

function readJsonSession(key, store) {
  try {
    const raw = (store || globalThis.sessionStorage)?.getItem?.(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function takeJsonSession(key, store) {
  try {
    const storage = store || globalThis.sessionStorage;
    const raw = storage?.getItem?.(key);
    storage?.removeItem?.(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeRxLabCheckout(payload, store) {
  labCheckoutBoot = undefined;
  try {
    (store || globalThis.sessionStorage)?.setItem?.(
      RX_LAB_CHECKOUT_KEY,
      JSON.stringify(payload || {})
    );
  } catch {
    /* ignore */
  }
}

export function peekRxLabCheckout(store) {
  if (labCheckoutBoot) return labCheckoutBoot;
  return readJsonSession(RX_LAB_CHECKOUT_KEY, store);
}

export function takeRxLabCheckout(store) {
  if (labCheckoutBoot !== undefined) return labCheckoutBoot;
  labCheckoutBoot = takeJsonSession(RX_LAB_CHECKOUT_KEY, store);
  return labCheckoutBoot;
}

export const RX_MED_CHECKOUT_KEY = "mediHomeRxMedicineCheckout";

export function writeRxMedicineCheckout(payload = { attachRx: true }, store) {
  medicineCheckoutBoot = undefined;
  try {
    (store || globalThis.sessionStorage)?.setItem?.(
      RX_MED_CHECKOUT_KEY,
      JSON.stringify(payload || { attachRx: true })
    );
  } catch {
    /* ignore */
  }
}

export function takeRxMedicineCheckout(store) {
  if (medicineCheckoutBoot !== undefined) return medicineCheckoutBoot;
  medicineCheckoutBoot = takeJsonSession(RX_MED_CHECKOUT_KEY, store);
  return medicineCheckoutBoot;
}

export const TEST_CART_KEY = "mediHomeTestCart";
export const TEST_CART_EVENT = "mediHomeTestCart";
export const MEDICINE_CHECKOUT_OPEN_EVENT = "mediHomeMedicineCheckoutOpen";
export const LAB_BOOKING_OPEN_EVENT = "mediHomeLabBookingOpen";

export function requestMedicineCheckout() {
  writeRxMedicineCheckout({ attachRx: true });
  globalThis.dispatchEvent?.(new Event(MEDICINE_CHECKOUT_OPEN_EVENT));
}

export function requestLabBooking(payload) {
  writeRxLabCheckout(payload || {});
  globalThis.dispatchEvent?.(
    new CustomEvent(LAB_BOOKING_OPEN_EVENT, { detail: payload || {} })
  );
}

export function testCartKey(item) {
  return `${item?.kind || "lab"}:${item?.partnerId || ""}:${item?.id || ""}`;
}

export function readTestCart(store) {
  try {
    const raw = (store || globalThis.localStorage)?.getItem?.(TEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeTestCart(cart, store) {
  try {
    (store || globalThis.localStorage)?.setItem?.(
      TEST_CART_KEY,
      JSON.stringify(Array.isArray(cart) ? cart : [])
    );
    globalThis.dispatchEvent?.(new Event(TEST_CART_EVENT));
  } catch {
    /* ignore */
  }
}

function normalizeTestCartItem(test, meta = {}) {
  const id = test?.id || test?.testId;
  const partnerId = meta.partnerId || test?.partnerId;
  if (!id || !partnerId) return null;
  return {
    id,
    name: test.name || test.testName || id,
    price: Number(test.price || 0),
    code: test.code || test.testId || id,
    prepType: test.prepType || "none",
    instruction: test.instruction || "",
    kind: meta.kind || test.kind || "lab",
    partnerId,
    partnerName: meta.partnerName || test.partnerName || "",
  };
}

export function addTestToCart(test, meta = {}, store, options = {}) {
  const item = normalizeTestCartItem(test, meta);
  if (!item) return readTestCart(store);
  const cart = readTestCart(store);
  const key = testCartKey(item);
  if (cart.some((row) => testCartKey(row) === key)) {
    if (options.open !== false) openShopCart();
    return cart;
  }
  const next = [...cart, item];
  writeTestCart(next, store);
  if (options.open !== false) openShopCart();
  return next;
}

export function cartHasTest(id, partnerId, store) {
  return readTestCart(store).some(
    (item) =>
      String(item.id) === String(id) &&
      String(item.partnerId) === String(partnerId || item.partnerId)
  );
}

export function removeTestFromCart(id, partnerId, store) {
  const next = readTestCart(store).filter(
    (item) =>
      !(
        String(item.id) === String(id) &&
        String(item.partnerId) === String(partnerId)
      )
  );
  writeTestCart(next, store);
  return next;
}

export function removeTestsForPartner(partnerId, kind, store) {
  const next = readTestCart(store).filter((item) => {
    if (String(item.partnerId) !== String(partnerId)) return true;
    if (kind && (item.kind || "lab") !== kind) return true;
    return false;
  });
  writeTestCart(next, store);
  return next;
}

export function shopCartCount(store) {
  const medicines = readMedicineCart(store).reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );
  return medicines + readTestCart(store).length;
}
