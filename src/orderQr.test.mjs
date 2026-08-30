import test from "node:test";
import assert from "node:assert/strict";
import {
  canShowCustomerScanDelivery,
  canShowRiderRetailerScan,
  canUseScanDelivery,
  nextQrScanAction,
  parseOrderQr,
  qrScanPatch,
  orderQrPath,
  scanActorFromSessions,
  scanLinksForApp,
} from "./orderQr.js";

test("QR payload and URL parsing recover the order id", () => {
  assert.equal(orderQrPath("MH-HC-123"), "#scan?id=MH-HC-123");
  assert.equal(parseOrderQr("MHQR:MH-LAB-55"), "MH-LAB-55");
  assert.equal(
    parseOrderQr("https://medihome.co.in/#scan?id=MH-AMB-9"),
    "MH-AMB-9"
  );
  assert.equal(
    parseOrderQr("https://medihome.in/#scan?id=MH-AMB-9"),
    "MH-AMB-9"
  );
  assert.equal(parseOrderQr("#track?id=1001"), "1001");
  assert.equal(parseOrderQr("MH-PSY-7788"), "MH-PSY-7788");
});

test("first scan is partner pickup, second scan is customer delivery", () => {
  const open = { kind: "medicine", trackStatus: "confirmed" };
  assert.equal(nextQrScanAction(open), "pickup");
  const picked = qrScanPatch(open, 1700000000000);
  assert.equal(picked.patch.trackStatus, "on_the_way");
  assert.equal(picked.patch.qrLastScan, "pickup");

  const delivered = qrScanPatch({ ...open, ...picked.patch }, 1700000001000);
  assert.equal(delivered.action, "deliver");
  assert.equal(delivered.patch.trackStatus, "done");
  assert.equal(delivered.patch.status, "Delivered");
});

test("Scan Delivery is only offered to a customer while receiving medicine", () => {
  const waitingPickup = { id: "MH-1", kind: "medicine", trackStatus: "confirmed" };
  const waitingReceive = {
    id: "MH-1",
    kind: "medicine",
    checkPickupAt: 1,
    qrPickedAt: 1,
    trackStatus: "on_the_way",
  };
  const labOnTheWay = {
    id: "MH-LAB-1",
    kind: "lab",
    checkPickupAt: 1,
    qrPickedAt: 1,
    trackStatus: "on_the_way",
  };
  const rider = { id: "p1", role: "Medicine rider", kinds: ["medicine"] };
  const labPartner = { id: "p2", role: "Lab", kinds: ["lab"] };

  assert.equal(canShowRiderRetailerScan(waitingPickup, rider), true);
  assert.equal(canShowCustomerScanDelivery(waitingPickup), false);
  assert.equal(canShowCustomerScanDelivery(waitingReceive), true);
  assert.equal(canShowRiderRetailerScan(waitingReceive, rider), false);
  assert.equal(canShowCustomerScanDelivery(labOnTheWay), false);
  assert.equal(canShowRiderRetailerScan(waitingPickup, labPartner), false);

  assert.deepEqual(
    scanLinksForApp("customer", waitingReceive).map((row) => row.label),
    ["Scan Delivery"]
  );
  assert.deepEqual(scanLinksForApp("customer", waitingPickup), []);
  assert.deepEqual(scanLinksForApp("customer", labOnTheWay), []);
  assert.deepEqual(
    scanLinksForApp("partner", waitingPickup, rider).map((row) => [row.step, row.label]),
    [["pickup", "Scan Delivery"]]
  );
  assert.deepEqual(
    scanLinksForApp("partner", waitingReceive, rider).map((row) => row.label),
    ["Scan Delivery"]
  );
  assert.deepEqual(scanLinksForApp("admin", waitingPickup).map((row) => row.step), [
    "pack",
    "pickup",
    "deliver",
  ]);
  assert.deepEqual(scanLinksForApp("admin", labOnTheWay), []);

  assert.equal(
    canUseScanDelivery({ app: "customer", order: waitingReceive, step: "deliver" }),
    true
  );
  assert.equal(
    canUseScanDelivery({ app: "customer", order: waitingPickup, step: "deliver" }),
    false
  );
  assert.equal(
    canUseScanDelivery({
      app: "partner",
      order: waitingPickup,
      step: "pickup",
      partner: rider,
    }),
    true
  );
  assert.equal(
    canUseScanDelivery({
      app: "partner",
      order: waitingReceive,
      step: "deliver",
      partner: rider,
    }),
    false
  );
  assert.equal(canUseScanDelivery({ app: "admin", order: labOnTheWay }), true);
  assert.equal(scanActorFromSessions({ staffToken: "t" }), "admin");
  assert.equal(scanActorFromSessions({ partner: rider }), "partner");
  assert.equal(scanActorFromSessions({}), "customer");
});

test("home care delivery marks completed, and a done order is not scanned again", () => {
  const delivered = qrScanPatch({
    kind: "homecare",
    trackStatus: "on_the_way",
    checkPickupAt: 1700000000000,
    qrPickedAt: 1700000000000,
  });
  assert.equal(delivered.patch.status, "Completed");
  assert.equal(
    nextQrScanAction({ trackStatus: "done", trackCompleted: true }),
    "already_done"
  );
});
