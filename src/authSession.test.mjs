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

if (!globalThis.localStorage) {
  globalThis.localStorage = memoryStore();
}
if (!globalThis.sessionStorage) {
  globalThis.sessionStorage = memoryStore();
}

const {
  LOGIN_SESSION_KEY,
  PROFILE_KEY,
  customerGreeting,
  logoutSession,
  needsCustomerWelcome,
  readLoginSession,
  writeLoginSession,
} = await import("./authSession.js");

function seedAsha() {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      name: "Asha",
      mobile: "9876543210",
      creatorMobile: "9876543210",
      email: "asha@medihome.in",
      pinCode: "110001",
      loginPin: "110001",
      gender: "F",
      dob: "1990-01-01",
    })
  );
}

test("home greeting uses the first name only", () => {
  assert.equal(customerGreeting({ name: "Asha" }), "Hello, Asha");
  assert.equal(customerGreeting({ name: "Asha Sharma" }), "Hello, Asha");
  assert.equal(customerGreeting({ name: "  Asha  " }), "Hello, Asha");
  assert.equal(customerGreeting({ name: "" }), "");
  assert.equal(customerGreeting({ mobile: "9876543210" }), "");
  assert.equal(customerGreeting(null), "");
});

test("logged-in customers skip welcome; guests see it until they choose", () => {
  const empty = memoryStore();
  assert.equal(needsCustomerWelcome(null, empty), true);
  empty.setItem("mediHomeEntryChosen", "1");
  assert.equal(needsCustomerWelcome(null, empty), false);
  assert.equal(
    needsCustomerWelcome({ name: "Asha", mobile: "9876543210" }, memoryStore()),
    false
  );
});

test("login persists Asha in localStorage so #home can greet after a dropped tab", () => {
  localStorage.clear();
  sessionStorage.clear();
  seedAsha();

  assert.equal(readLoginSession(), null);
  assert.equal(needsCustomerWelcome(readLoginSession()), true);

  writeLoginSession({
    name: "Asha",
    mobile: "9876543210",
    creatorMobile: "9876543210",
  });

  assert.equal(localStorage.getItem(LOGIN_SESSION_KEY), "1");
  let user = readLoginSession();
  assert.equal(user.name, "Asha");
  assert.equal(user.mobile, "9876543210");
  assert.equal(needsCustomerWelcome(user), false);
  assert.equal(customerGreeting(user), "Hello, Asha");

  sessionStorage.clear();
  user = readLoginSession();
  assert.equal(user?.name, "Asha");
  assert.equal(needsCustomerWelcome(user), false);
  assert.equal(customerGreeting(user), "Hello, Asha");

  logoutSession();
  assert.equal(localStorage.getItem(LOGIN_SESSION_KEY), null);
  assert.equal(readLoginSession(), null);
  assert.equal(needsCustomerWelcome(readLoginSession()), true);
});

test("create account and login send a new holder to #home, not Profile", () => {
  const authPage = readFileSync(new URL("./AuthPage.jsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("./CustomerHome.jsx", import.meta.url), "utf8");
  assert.equal(/next === "#home" \? "#profile"/.test(authPage), false);
  assert.match(authPage, /consumeReturnHash\(\)/);
  assert.match(home, /customerGreeting\(user\)/);
  assert.match(home, /className="app-home-hello"/);
});
