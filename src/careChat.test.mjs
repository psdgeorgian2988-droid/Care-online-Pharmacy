import test from "node:test";
import assert from "node:assert/strict";
import { replyTo, welcomeMessage } from "./careChat.js";

test("care replies route medicine, track, ambulance, and human handoff", () => {
  const medicine = replyTo("I need medicines delivered");
  assert.match(medicine.text, /Search by brand/);
  assert.equal(medicine.links[0].href, "#medicine-search");
  assert.match(replyTo("track my order").text, /My Orders/);
  assert.match(replyTo("I need an ambulance").text, /112/);
  const human = replyTo("Please connect me to a care executive");
  assert.equal(human.needsStaff, true);
  assert.match(human.text, /executive/);
  assert.match(human.text, /72920 94000/);
  assert.equal(
    human.links.some((link) => link.href === "tel:+917292094000"),
    true
  );
  const scanHelp = replyTo("How do I scan the QR?");
  assert.match(scanHelp.text, /Scan Delivery/);
  assert.equal(
    scanHelp.links.some((link) => String(link.href).startsWith("#scan")),
    false
  );
  const welcome = welcomeMessage();
  assert.match(welcome.text, /72920 94000/);
  assert.equal(welcome.links[0].href, "tel:+917292094000");
});
