import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAppHash } from "./hashRoute.js";

test("empty and home hashes open the home page", () => {
  for (const hash of ["", "#", "#home", "#/home", "#HOME", "#/Home"]) {
    assert.equal(parseAppHash(hash).route, "#home", hash);
  }
});

test("login and register hashes open their own pages", () => {
  assert.equal(parseAppHash("#login").route, "#login");
  assert.equal(parseAppHash("#register").route, "#register");
});

test("service hashes stay on their own pages", () => {
  assert.equal(parseAppHash("#labs").route, "#labs");
  assert.equal(parseAppHash("#medicine-search?q=dolo").route, "#medicine-search");
  assert.equal(parseAppHash("#medicine-search?q=dolo").q, "dolo");
  assert.equal(parseAppHash("#scan?step=deliver").step, "deliver");
});
