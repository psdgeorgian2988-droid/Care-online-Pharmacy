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
