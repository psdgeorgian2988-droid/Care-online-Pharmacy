import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DELIVERY_RECORD_MS,
  deliveryRecordIsFresh,
  isDeliveryPartner,
  isPharmacyStorePartner,
} from "./partnerRetention.js";

test("pharmacy store partners are not treated as delivery riders", () => {
  assert.equal(
    isPharmacyStorePartner({ kinds: ["medicine"], role: "Pharmacy partner" }),
    true
  );
  assert.equal(
    isDeliveryPartner({ kinds: ["medicine"], role: "Pharmacy partner" }),
    false
  );
  assert.equal(
    isDeliveryPartner({ kinds: ["medicine"], role: "Medicine rider" }),
    true
  );
  assert.equal(
    isPharmacyStorePartner({ kinds: ["medicine"], role: "Medicine rider" }),
    false
  );
});

test("delivery records stay for one month after handover", () => {
  const now = 1_800_000_000_000;
  assert.equal(
    deliveryRecordIsFresh(
      { trackCompleted: true, checkDeliverAt: now - (29 * 24 * 60 * 60 * 1000) },
      now
    ),
    true
  );
  assert.equal(
    deliveryRecordIsFresh(
      { trackStatus: "done", checkDeliverAt: now - DELIVERY_RECORD_MS - 1 },
      now
    ),
    false
  );
  assert.equal(
    deliveryRecordIsFresh({ trackStatus: "on_the_way" }, now),
    true
  );
});
