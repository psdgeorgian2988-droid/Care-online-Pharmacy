import test from "node:test";
import assert from "node:assert/strict";
import { replyTo } from "./careChat.js";

test("care replies route medicine, track, ambulance, and human handoff", () => {
  const medicine = replyTo("I need medicines delivered");
  assert.match(medicine.text, /Search by brand/);
  assert.equal(medicine.links[0].href, "#medicine-search");
  assert.match(replyTo("track my order").text, /My Orders/);
  assert.match(replyTo("I need an ambulance").text, /112/);
  const human = replyTo("Please connect me to a care executive");
  assert.equal(human.needsStaff, true);
  assert.match(human.text, /executive/);
});
