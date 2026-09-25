import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAppHash } from "./hashRoute.js";

test("empty and home hashes open the home page", () => {
  for (const hash of ["", "#", "#home", "#/home", "#HOME", "#/Home"]) {
    assert.equal(parseAppHash(hash).route, "#home", hash);
  }
});

test("social aliases and desk pages resolve correctly", () => {
  assert.equal(parseAppHash("#social").route, "#contact");
  assert.equal(parseAppHash("#staff").route, "#staff");
  assert.equal(parseAppHash("#ops").route, "#admin");
  assert.equal(parseAppHash("#partners").route, "#partner");
  assert.equal(parseAppHash("#partner-desk").route, "#partner-desk");
  assert.equal(parseAppHash("#partnerdesk").route, "#partner-desk");
  assert.equal(parseAppHash("#pharmacy").route, "#pharmacy-desk");
  assert.equal(parseAppHash("#delivery").route, "#delivery-desk");
  assert.equal(parseAppHash("#lab-desk").route, "#lab-desk");
  assert.equal(parseAppHash("#customer").route, "#customer");
  assert.equal(parseAppHash("#app").route, "#portals");
  assert.equal(parseAppHash("#apps").route, "#portals");
});

test("login, register and forgot hashes open their own pages", () => {
  assert.equal(parseAppHash("#login").route, "#login");
  assert.equal(parseAppHash("#register").route, "#register");
  assert.equal(parseAppHash("#forgot").route, "#forgot");
});

test("service hashes stay on their own pages", () => {
  assert.equal(parseAppHash("#labs").route, "#labs");
  assert.equal(parseAppHash("#medicine-search?q=dolo").route, "#medicine-search");
  assert.equal(parseAppHash("#medicine-search?q=dolo").q, "dolo");
  assert.equal(parseAppHash("#scan?step=deliver").step, "deliver");
  assert.equal(parseAppHash("#homecare?service=nurse&plan=vaccination").route, "#homecare");
  assert.equal(parseAppHash("#homecare?service=nurse&plan=vaccination").service, "nurse");
  assert.equal(parseAppHash("#homecare?service=nurse&plan=vaccination-child").plan, "vaccination-child");
});
