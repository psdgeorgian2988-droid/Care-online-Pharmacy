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

test("first scan is partner pickup, second scan is customer receive", () => {
  const open = { kind: "medicine", trackStatus: "confirmed" };
  assert.equal(nextQrScanAction(open), "pickup");
  const picked = qrScanPatch(open, 1700000000000);
  assert.equal(picked.patch.trackStatus, "on_the_way");
  assert.equal(picked.patch.qrLastScan, "pickup");

  const receive = qrScanPatch({ ...open, ...picked.patch }, 1700000001000);
  assert.equal(receive.action, "receive");
  assert.equal(receive.patch.trackStatus, "done");
  assert.equal(receive.patch.status, "Delivered");
});

test("home care receive marks completed, and a done order is not scanned again", () => {
  const receive = qrScanPatch({
    kind: "homecare",
    trackStatus: "on_the_way",
  });
  assert.equal(receive.patch.status, "Completed");
  assert.equal(
    nextQrScanAction({ trackStatus: "done", trackCompleted: true }),
    "already_done"
  );
});
