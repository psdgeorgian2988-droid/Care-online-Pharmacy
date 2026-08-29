import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APP_ROLES,
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
  assert.equal(APP_ROLES.partner.hash, "#partner");
});

test("website visitors do not see the app picker", () => {
  assert.equal(shouldShowAppPicker("#home", {}), false);
  assert.equal(shouldShowAppPicker("#apps", {}), true);
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
  assert.equal(launchHashForRole("partner", "#home", session2), "#partner");
  assert.equal(launchHashForRole("customer", "#home", memoryStore()), "");
});
