import test from "node:test";
import assert from "node:assert/strict";
import { apiUrl, readApiBase } from "./apiBase.js";

test("website requests stay on the same origin", () => {
  assert.equal(readApiBase({ VITE_API_BASE_URL: "" }), "");
  assert.equal(apiUrl("/api/features", { VITE_API_BASE_URL: "" }), "/api/features");
});

test("native app builds call the MediHome API host", () => {
  const env = { VITE_API_BASE_URL: "https://medihome.co.in" };
  assert.equal(readApiBase(env), "https://medihome.co.in");
  assert.equal(apiUrl("/api/orders", env), "https://medihome.co.in/api/orders");
});

test("native runtime without an env override uses the live site URL", () => {
  const env = { VITE_API_BASE_URL: "" };
  const native = { Capacitor: { isNativePlatform: () => true } };
  assert.equal(readApiBase(env, native), "https://medihome.co.in");
});

test("Android emulator live reload keeps API calls on the laptop host", () => {
  const env = { VITE_API_BASE_URL: "" };
  const emulator = {
    Capacitor: { isNativePlatform: () => true },
    location: { protocol: "http:", hostname: "10.0.2.2", port: "5173" },
  };
  assert.equal(readApiBase(env, emulator), "");
  assert.equal(apiUrl("/api/pincode/122001", env, emulator), "/api/pincode/122001");
});

test("bundled native app on https localhost still uses the live API host", () => {
  const env = { VITE_API_BASE_URL: "" };
  const bundled = {
    Capacitor: { isNativePlatform: () => true },
    location: { protocol: "https:", hostname: "localhost", port: "" },
  };
  assert.equal(readApiBase(env, bundled), "https://medihome.co.in");
});
