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
  hasAccountSession,
  logoutSession,
  needsCustomerWelcome,
  readLoginSession,
  writeLoginSession,
} = await import("./authSession.js");
const { logOutCustomer } = await import("./customerLogout.js");

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

test("guests and signed-out visitors are not account sessions", () => {
  assert.equal(hasAccountSession(null), false);
  assert.equal(hasAccountSession({ mobile: "9876543210", isGuest: true }), false);
  assert.equal(hasAccountSession({ name: "Asha" }), false);
  assert.equal(
    hasAccountSession({ name: "Asha", mobile: "9876543210" }),
    true
  );
});

test("log out clears the customer login and guest checkout, then returns to welcome", () => {
  localStorage.clear();
  sessionStorage.clear();
  seedAsha();
  writeLoginSession({
    name: "Asha",
    mobile: "9876543210",
    creatorMobile: "9876543210",
  });
  sessionStorage.setItem("mediHomeEntryChosen", "1");
  localStorage.setItem(
    "mediHomeGuestCheckout",
    JSON.stringify({ name: "Guest", mobile: "9876543210", isGuest: true })
  );
  localStorage.setItem("mediHomePartnerToken", "keep-partner");
  localStorage.setItem("mediHomeStaffToken", "keep-staff");

  const pushed = [];
  globalThis.window = {
    location: {
      hash: "#profile",
      pathname: "/",
      search: "?app=1",
      href: "http://localhost/?app=1#profile",
    },
    history: {
      pushState(_state, _title, url) {
        pushed.push(String(url));
      },
    },
    dispatchEvent() {
      return true;
    },
  };

  try {
    logOutCustomer();
  } finally {
    delete globalThis.window;
  }

  assert.equal(localStorage.getItem(LOGIN_SESSION_KEY), null);
  assert.equal(readLoginSession(), null);
  assert.equal(needsCustomerWelcome(null), true);
  assert.equal(localStorage.getItem("mediHomeGuestCheckout"), null);
  assert.equal(localStorage.getItem(PROFILE_KEY) != null, true);
  assert.equal(localStorage.getItem("mediHomePartnerToken"), "keep-partner");
  assert.equal(localStorage.getItem("mediHomeStaffToken"), "keep-staff");
  assert.ok(pushed.some((url) => url.includes("#home")));
  assert.equal(pushed.some((url) => url.includes("#partner") || url.includes("#admin")), false);
});

test("log out is shown for registered customers on account and both shells", () => {
  const profile = readFileSync(new URL("./Profile.jsx", import.meta.url), "utf8");
  const header = readFileSync(new URL("./AppHeader.jsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const button = readFileSync(new URL("./CustomerLogOut.jsx", import.meta.url), "utf8");
  const tabs = readFileSync(new URL("./AppBottomNav.jsx", import.meta.url), "utf8");

  assert.match(button, /Log out/);
  assert.match(button, /hasAccountSession\(user\)/);
  assert.match(profile, /CustomerLogOut/);
  assert.match(header, /CustomerLogOut/);
  assert.match(app, /CustomerLogOut/);
  assert.match(app, /className="site-logout-btn"/);
  assert.match(app, /className="home-account-btn"/);
  assert.match(app, /hasAccountSession\(user\)/);
  assert.match(
    tabs,
    /Account[\s\S]*Medicines[\s\S]*Labs[\s\S]*Orders[\s\S]*Doctor[\s\S]*Medical Record[\s\S]*Home Care[\s\S]*Vaccination/
  );
});

test("create account and login send a new holder to #home, not Profile", () => {
  const authPage = readFileSync(new URL("./AuthPage.jsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("./CustomerHome.jsx", import.meta.url), "utf8");
  assert.equal(/next === "#home" \? "#profile"/.test(authPage), false);
  assert.match(authPage, /consumeReturnHash\(\)/);
  assert.match(home, /customerGreeting\(user\)/);
  assert.match(home, /className="app-home-hello"/);
});
