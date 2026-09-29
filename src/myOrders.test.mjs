import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const src = readFileSync(new URL("./MyOrders.jsx", import.meta.url), "utf8");

test("My Orders uses service tabs and keeps completed rows in the tab", () => {
  assert.match(src, /CUSTOMER_SERVICE_TABS/);
  assert.match(src, /ordersForCustomerTab/);
  assert.match(src, /Choose a service to see your orders/);
  assert.match(src, /aria-selected=\{serviceTab === tab\.value\}/);
  assert.match(src, /tabFromHash\(window.location.hash\)/);
  assert.match(src, /typeof window === "undefined" \? ""/);
  assert.match(src, /ServiceIcon/);
  assert.match(src, /tab\.value/);
  assert.doesNotMatch(src, /useState\("medicine"\)/);
  assert.doesNotMatch(src, /useState\("all"\)/);
  assert.doesNotMatch(src, /completedOrders\(/);
  assert.doesNotMatch(src, /orders-subtitle/);
});

test("My Orders opens the full order and tracks only while ongoing", () => {
  assert.match(src, /OrderFullView/);
  assert.match(src, /isOngoingTrackOrder/);
  assert.match(src, /Track order/);
  assert.match(src, /audience="customer"/);
  assert.match(src, /<OrderFullView order=\{selectedOrder\} audience="customer" \/>/);
  assert.doesNotMatch(src, /audience="partner"/);
});
