import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APP_PREVIEW_KEY,
  APP_ROLES,
  bootAppPreview,
  isAppPreview,
  isAppShell,
  launchHashForRole,
  readAppRole,
  shouldShowAppPicker,
  writeAppRole,
} from "./appRuntime.js";

function memoryStore(start = {}) {
  const data = { ...start };
  return {
    getItem(key) {
      return Object.hasOwn(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

test("customer, staff and partner apps have start hashes", () => {
  assert.equal(APP_ROLES.customer.hash, "#home");
  assert.equal(APP_ROLES.staff.hash, "#admin");
  assert.equal(APP_ROLES.partner.hash, "#partner-desk");
  assert.equal(APP_ROLES.partner.portal, "#partner");
});

test("website visitors do not see the portals chooser on home", () => {
  assert.equal(shouldShowAppPicker("#home", {}), false);
  assert.equal(shouldShowAppPicker("#apps", {}), true);
  assert.equal(shouldShowAppPicker("#portals", {}), true);
});

test("an installed app with no role opens the picker on home", () => {
  const env = { Capacitor: { isNativePlatform: () => true } };
  assert.equal(shouldShowAppPicker("#home", env, memoryStore()), true);
  assert.equal(shouldShowAppPicker("#labs", env, memoryStore()), false);
});

test("an installed app with a saved role skips the picker", () => {
  const env = { Capacitor: { isNative: true } };
  const store = memoryStore();
  writeAppRole("customer", store);
  assert.equal(readAppRole(store), "customer");
  assert.equal(shouldShowAppPicker("#home", env, store), false);
});

test("staff and partner launch once from home into their desk", () => {
  const session = memoryStore();
  assert.equal(launchHashForRole("staff", "#home", session), "#admin");
  assert.equal(launchHashForRole("staff", "#home", session), "");
  const session2 = memoryStore();
  assert.equal(launchHashForRole("partner", "#home", session2), "#partner-desk");
  assert.equal(launchHashForRole("customer", "#home", memoryStore()), "");
});

test("a native Android app opens the customer shell, not the website menu", () => {
  const store = memoryStore();
  const env = {
    Capacitor: { isNativePlatform: () => true },
    localStorage: store,
    location: { search: "" },
  };
  bootAppPreview(env, store);
  assert.equal(isAppShell(env), true);
  assert.equal(readAppRole(store), "customer");
  assert.equal(shouldShowAppPicker("#home", env, store), false);
});

test("?app=1 opens the customer app shell in the browser", () => {
  const store = memoryStore();
  const env = {
    location: { search: "?app=1" },
    localStorage: store,
  };
  assert.equal(isAppPreview(env), true);
  assert.equal(isAppShell(env), true);
  bootAppPreview(env, store);
  assert.equal(store.getItem(APP_PREVIEW_KEY), "1");
  assert.equal(readAppRole(store), "customer");
  assert.equal(shouldShowAppPicker("#home", env, store), false);
});

test("?app=0 turns the browser preview off", () => {
  const store = memoryStore({ [APP_PREVIEW_KEY]: "1" });
  const env = {
    location: { search: "?app=0" },
    localStorage: store,
  };
  bootAppPreview(env, store);
  assert.equal(isAppPreview(env), false);
  assert.equal(store.getItem(APP_PREVIEW_KEY), null);
});
