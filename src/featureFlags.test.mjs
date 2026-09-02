import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FEATURES,
  featureEnabled,
  mergeFeatures,
  routeEnabled,
} from "./salesReport.js";

test("services stay off until admin explicitly saves them on", () => {
  assert.equal(featureEnabled(DEFAULT_FEATURES, "medicine"), false);
  assert.equal(featureEnabled({}, "medicine"), false);
  assert.equal(featureEnabled({ medicine: true }, "medicine"), true);
  assert.equal(featureEnabled({ medicine: false }, "medicine"), false);
});

test("mergeFeatures keeps only saved switch values", () => {
  const merged = mergeFeatures({
    medicine: true,
    lab: false,
  });
  assert.equal(merged.medicine, true);
  assert.equal(merged.lab, false);
  assert.equal(merged.vaccination, false);
  assert.equal(merged.scanDelivery, false);
});

test("routes open only when a saved feature is on", () => {
  assert.equal(routeEnabled("#medicine-search", { medicine: true }), true);
  assert.equal(routeEnabled("#medicine-search", { medicine: false }), false);
  assert.equal(routeEnabled("#medicine-search", {}), false);
});
