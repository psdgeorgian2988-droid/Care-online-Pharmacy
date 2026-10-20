import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function memoryStore() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

globalThis.localStorage = memoryStore();
globalThis.sessionStorage = memoryStore();

const {
  CUSTOMER_DATA_RESET_KEY,
  CUSTOMER_DATA_RESET_TOKEN,
  resetCustomerDataThroughToday,
} = await import("./customerDataReset.js");
const { LOGIN_SESSION_KEY, PROFILE_KEY } = await import("./authSession.js");

test("one-time reset clears customer registration and orders", () => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: "Asha", mobile: "9876543210" }));
  localStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify({ mobile: "9876543210" }));
  localStorage.setItem("mediHomeOrders", JSON.stringify([{ id: "MH-1" }]));
  localStorage.setItem("mediHomePartnerToken", "keep-partner");

  assert.equal(resetCustomerDataThroughToday(), true);
  assert.equal(localStorage.getItem(PROFILE_KEY), null);
  assert.equal(localStorage.getItem(LOGIN_SESSION_KEY), null);
  assert.equal(localStorage.getItem("mediHomeOrders"), null);
  assert.equal(localStorage.getItem("mediHomePartnerToken"), "keep-partner");
  assert.equal(localStorage.getItem(CUSTOMER_DATA_RESET_KEY), CUSTOMER_DATA_RESET_TOKEN);

  localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: "New" }));
  assert.equal(resetCustomerDataThroughToday(), false);
  assert.equal(JSON.parse(localStorage.getItem(PROFILE_KEY)).name, "New");
});

test("app boots the one-time wipe and hides header cart on home", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("./CustomerHome.jsx", import.meta.url), "utf8");
  const rx = readFileSync(new URL("./HomePrescriptionUpload.jsx", import.meta.url), "utf8");
  assert.match(app, /resetCustomerDataThroughToday\(\)/);
  assert.match(app, /hideCart=\{hideHomeCart\}/);
  assert.match(app, /hideHomeCart \? null : <HeaderCart/);
  assert.doesNotMatch(home, /Current Status/);
  assert.match(rx, /home-rx-cart-row/);
  assert.match(rx, /className="home-rx-tab/);
  assert.match(rx, /className="home-rx-cart"/);
});
