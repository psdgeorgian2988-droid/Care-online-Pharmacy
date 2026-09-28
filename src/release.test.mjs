import test from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "../server/handler.mjs";
import { RELEASE } from "../server/release.mjs";
import { cacheControlFor } from "../server/static.mjs";

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(payload) {
      this.body = payload;
    },
  };
}

test("release id is the partner login-id website", () => {
  assert.equal(RELEASE.id, "partner-login-id");
});

test("GET /api/version reports the partner login-id release", async () => {
  const res = mockRes();
  const handled = await handleApi(
    { method: "GET", url: "/api/version", headers: {} },
    res
  );
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.release, "partner-login-id");
  assert.equal(body.partnerLogin, "loginId");
});

test("HTML and the service worker are not cached", () => {
  assert.match(cacheControlFor("/tmp/dist/index.html"), /no-store/);
  assert.match(cacheControlFor("/tmp/dist/sw.js"), /no-store/);
});

test("hashed assets can be cached", () => {
  assert.match(
    cacheControlFor("/tmp/dist/assets/index-FWW_GC4Z.js"),
    /immutable/
  );
});
