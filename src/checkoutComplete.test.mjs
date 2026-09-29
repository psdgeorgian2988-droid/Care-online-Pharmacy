import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  goHomeAfterPaidCheckout,
  shouldGoHomeAfterPayment,
} from "./checkoutComplete.js";
import {
  readMedicineCart,
  readTestCart,
  writeMedicineCart,
  writeTestCart,
} from "./medicineCartStore.js";
import { diagnosticPartnerRouteFields } from "./orderConfirm.js";
import { isExclusivePartnerId, partnerCanAccessJob } from "../server/partners.mjs";

function memoryStore(start = {}) {
  const data = { ...start };
  return {
    getItem(key) {
      return Object.hasOwn(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

test("paid online checkout blanks both carts and goes #home", () => {
  const store = memoryStore();
  writeMedicineCart([{ id: "m1", name: "Aspirin", quantity: 1 }], store);
  writeTestCart(
    [{ id: "t1", name: "CBC", partnerId: "lal-pathlabs", kind: "lab" }],
    store
  );
  assert.equal(readMedicineCart(store).length, 1);
  assert.equal(readTestCart(store).length, 1);

  const hashes = [];
  globalThis.HashChangeEvent = class HashChangeEvent {
    constructor() {}
  };
  globalThis.window = {
    location: { pathname: "/", search: "", hash: "#checkout" },
    history: {
      pushState(_state, _title, url) {
        hashes.push(String(url));
      },
    },
    dispatchEvent() {},
  };

  assert.equal(shouldGoHomeAfterPayment("upi", { paymentStatus: "paid" }), true);
  assert.equal(shouldGoHomeAfterPayment("cod", { paymentStatus: "cod" }), false);

  goHomeAfterPaidCheckout(store);
  assert.deepEqual(readMedicineCart(store), []);
  assert.deepEqual(readTestCart(store), []);
  assert.match(hashes.at(-1) || "", /#home$/);
});

test("COD confirm does not use the paid-home helper", () => {
  assert.equal(shouldGoHomeAfterPayment("cod", { paymentStatus: "cod" }), false);
  assert.equal(shouldGoHomeAfterPayment("upi", { paymentStatus: "paid", paid: true }), true);
});

test("lab and radiology persist catalog preference, not exclusive partnerId", () => {
  const lab = diagnosticPartnerRouteFields({
    id: "lal-pathlabs",
    name: "Dr Lal PathLabs",
  });
  assert.equal(lab.partnerId, "");
  assert.equal(lab.preferredPartnerId, "lal-pathlabs");
  assert.equal(isExclusivePartnerId("lal-pathlabs"), false);
  assert.equal(isExclusivePartnerId("P-LAB-01"), true);

  const pendingLab = {
    kind: "lab",
    partnerId: lab.partnerId,
    preferredPartnerId: lab.preferredPartnerId,
    trackStatus: "requested",
    partnerConfirmStatus: "pending",
    partnerConfirmed: false,
  };
  assert.equal(
    partnerCanAccessJob({ id: "P-LAB-01", kinds: ["lab"] }, pendingLab),
    true
  );
  assert.equal(
    partnerCanAccessJob({ id: "P-MED-01", kinds: ["medicine"] }, pendingLab),
    false
  );

  const metro = diagnosticPartnerRouteFields({
    id: "metropolis",
    name: "Metropolis",
  });
  assert.equal(metro.partnerId, "");
  assert.equal(metro.preferredPartnerId, "metropolis");
  assert.equal(
    partnerCanAccessJob({ id: "P-LAB-01", kinds: ["lab"] }, {
      kind: "lab",
      partnerId: metro.partnerId,
      preferredPartnerId: metro.preferredPartnerId,
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
      partnerConfirmed: false,
    }),
    true
  );

  const scan = diagnosticPartnerRouteFields({
    id: "rad-delhi",
    name: "MediHome Delhi",
  });
  assert.equal(scan.partnerId, "");
  assert.equal(scan.preferredPartnerId, "rad-delhi");
  assert.equal(
    partnerCanAccessJob(
      { id: "P-RAD-01", kinds: ["radiology"] },
      {
        kind: "radiology",
        partnerId: scan.partnerId,
        preferredPartnerId: scan.preferredPartnerId,
        trackStatus: "requested",
        partnerConfirmStatus: "pending",
        partnerConfirmed: false,
      }
    ),
    true
  );
});

test("checkout and lab pay settle persist before going home", () => {
  const cartCheckout = readFileSync(new URL("./CartCheckout.jsx", import.meta.url), "utf8");
  const labTests = readFileSync(new URL("./LabTests.jsx", import.meta.url), "utf8");
  const persistAt = cartCheckout.indexOf("persistAndSendOrder");
  const homeAt = cartCheckout.indexOf("goHomeAfterPaidCheckout");
  assert.ok(persistAt > 0 && persistAt < homeAt, "cart must send the order before #home");
  const labPersist = labTests.indexOf("persistAndSendOrder");
  const labHome = labTests.indexOf("goHomeAfterPaidCheckout");
  assert.ok(labPersist > 0 && labPersist < labHome, "lab must send the order before #home");
  assert.match(cartCheckout, /diagnosticPartnerRouteFields/);
  assert.match(labTests, /diagnosticPartnerRouteFields/);
  assert.match(labTests, /Confirm booking · ₹\$\{total\}/);
});
