import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { bindHttpServer, productionListen } from "./listenOptions.mjs";

test("defaults to port 3001 on 0.0.0.0 (not Vite 5173)", () => {
  assert.deepEqual(productionListen({}), {
    port: 3001,
    host: "0.0.0.0",
    passenger: false,
  });
});

test("reads PORT from the host environment", () => {
  assert.equal(productionListen({ PORT: "8080" }).port, 8080);
  assert.equal(productionListen({ PORT: "8080" }).host, "0.0.0.0");
});

test("PORT wins over MEDIHOME_API_PORT", () => {
  assert.equal(
    productionListen({ PORT: "8080", MEDIHOME_API_PORT: "3001" }).port,
    8080
  );
  assert.equal(productionListen({ MEDIHOME_API_PORT: "4000" }).port, 4000);
});

test("binds MEDIHOME_HOST when set", () => {
  assert.equal(
    productionListen({ PORT: "3001", MEDIHOME_HOST: "127.0.0.1" }).host,
    "127.0.0.1"
  );
});

test("rejects Vite-style or invalid PORT values", () => {
  assert.throws(() => productionListen({ PORT: "not-a-port" }), /Invalid PORT/);
  assert.throws(() => productionListen({ PORT: "0" }), /Invalid PORT/);
});

test("Passenger uses reverse port binding instead of a TCP port", () => {
  globalThis.PhusionPassenger = {};
  try {
    assert.deepEqual(productionListen({ PORT: "3001" }), {
      port: "passenger",
      host: undefined,
      passenger: true,
    });
  } finally {
    delete globalThis.PhusionPassenger;
  }
});

test("bindHttpServer listens on the given host", async () => {
  const server = http.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    bindHttpServer(server, { port: 0, host: "127.0.0.1" }, resolve);
  });
  const addr = server.address();
  assert.equal(addr.address, "127.0.0.1");
  assert.ok(addr.port > 0);
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test("npm start is the production Node server, not Vite", async () => {
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8")
  );
  assert.equal(pkg.main, "app.js");
  assert.equal(pkg.scripts.start, "node app.js");
  assert.equal(pkg.scripts.dev.includes("vite"), true);
});
