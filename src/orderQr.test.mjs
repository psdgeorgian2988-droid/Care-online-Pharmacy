import test from "node:test";
import assert from "node:assert/strict";
import {
  nextQrScanAction,
  parseOrderQr,
  qrScanPatch,
  orderQrPath,
} from "./orderQr.js";

test("QR payload and URL parsing recover the order id", () => {
  assert.equal(orderQrPath("MH-HC-123"), "#scan?id=MH-HC-123");
  assert.equal(parseOrderQr("MHQR:MH-LAB-55"), "MH-LAB-55");
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
