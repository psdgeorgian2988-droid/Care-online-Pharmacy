import test from "node:test";
import assert from "node:assert/strict";
import {
  canShowCustomerScanDelivery,
  canShowRiderRetailerScan,
  canUseScanDelivery,
  customerScanLink,
  nextQrScanAction,
  parseOrderQr,
  qrScanPatch,
  orderQrPath,
  scanActorFromSessions,
  scanLinksForApp,
  scanStepTitle,
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

test("Scan Delivery is only offered to a customer at the service moment", () => {
  const waitingPickup = { id: "MH-1", kind: "medicine", trackStatus: "confirmed" };
  const waitingReceive = {
    id: "MH-1",
    kind: "medicine",
    checkPickupAt: 1,
    qrPickedAt: 1,
    trackStatus: "on_the_way",
  };
  const labWaitingCollection = {
    id: "MH-LAB-0",
    kind: "lab",
    trackStatus: "assigned",
    partnerId: "lab-1",
  };
  const labOnTheWay = {
    id: "MH-LAB-1",
    kind: "lab",
    checkPickupAt: 1,
    qrPickedAt: 1,
    trackStatus: "on_the_way",
  };
  const radiologyWaiting = {
    id: "MH-RAD-1",
    kind: "radiology",
    trackStatus: "assigned",
    partnerId: "centre-1",
    partner: "NCR Imaging Centre",
  };
  const radiologyNoCentre = {
    id: "MH-RAD-2",
    kind: "radiology",
    trackStatus: "confirmed",
  };
  const radiologyCheckedIn = {
    id: "MH-RAD-1",
    kind: "radiology",
    partnerId: "centre-1",
    checkPickupAt: 1,
    qrPickedAt: 1,
    trackStatus: "on_the_way",
  };
  const homeCareBooked = {
    id: "MH-HC-1",
    kind: "homecare",
    serviceType: "nurse",
    trackStatus: "assigned",
    partnerId: "nurse-1",
  };
  const homeCareArriving = {
    id: "MH-HC-1",
    kind: "homecare",
    serviceType: "nurse",
    trackStatus: "arriving",
  };
  const homeCareServing = {
    id: "MH-HC-1",
    kind: "homecare",
    serviceType: "nurse",
    checkPickupAt: 1,
    qrPickedAt: 1,
    trackStatus: "on_the_way",
  };
  const rider = { id: "p1", role: "Medicine rider", kinds: ["medicine"] };
  const labPartner = { id: "p2", role: "Lab", kinds: ["lab"] };
  const homePartner = { id: "p3", role: "Home Care", kinds: ["homecare"] };
  const radiologyPartner = { id: "p4", role: "Imaging Centre", kinds: ["radiology"] };

  assert.equal(canShowRiderRetailerScan(waitingPickup, rider), true);
  assert.equal(canShowCustomerScanDelivery(waitingPickup), false);
  assert.equal(canShowCustomerScanDelivery(waitingReceive), true);
  assert.equal(canShowRiderRetailerScan(waitingReceive, rider), false);
  assert.equal(canShowCustomerScanDelivery(labWaitingCollection), false);
  assert.equal(canShowCustomerScanDelivery(labOnTheWay), true);
  assert.equal(canShowRiderRetailerScan(waitingPickup, labPartner), false);

  assert.deepEqual(customerScanLink(radiologyWaiting), {
    step: "pickup",
    label: "Scan Centre Check-In",
  });
  assert.equal(customerScanLink(radiologyNoCentre), null);
  assert.equal(customerScanLink(radiologyCheckedIn), null);
  assert.equal(customerScanLink(homeCareBooked), null);
  assert.deepEqual(customerScanLink(homeCareArriving), {
    step: "pickup",
    label: "Scan Nurse Visit Start",
  });
  assert.deepEqual(customerScanLink(homeCareServing), {
    step: "deliver",
    label: "Scan Nursing Complete",
  });
  assert.deepEqual(customerScanLink(labOnTheWay), {
    step: "deliver",
    label: "Scan Sample Received",
  });

  assert.deepEqual(
    scanLinksForApp("customer", waitingReceive).map((row) => row.label),
    ["Scan Delivery"]
  );
  assert.deepEqual(scanLinksForApp("customer", waitingPickup), []);
  assert.deepEqual(
    scanLinksForApp("customer", labOnTheWay).map((row) => [row.step, row.label]),
    [["deliver", "Scan Sample Received"]]
  );
  assert.deepEqual(
    scanLinksForApp("customer", radiologyWaiting).map((row) => [row.step, row.label]),
    [["pickup", "Scan Centre Check-In"]]
  );
  assert.deepEqual(scanLinksForApp("customer", radiologyNoCentre), []);
  assert.deepEqual(
    scanLinksForApp("partner", waitingPickup, rider).map((row) => [row.step, row.label]),
    [["pickup", "Scan Delivery"]]
  );
  assert.deepEqual(scanLinksForApp("partner", waitingReceive, rider), []);
  assert.deepEqual(
    scanLinksForApp("partner", labWaitingCollection, labPartner).map((row) => [
      row.step,
      row.label,
    ]),
    [["pickup", "Scan Collection Start"]]
  );
  assert.deepEqual(scanLinksForApp("partner", labOnTheWay, labPartner), []);
  assert.deepEqual(scanLinksForApp("partner", radiologyWaiting, radiologyPartner), []);
  assert.deepEqual(
    scanLinksForApp("partner", homeCareArriving, homePartner).map((row) => row.label),
    ["Scan Nurse Visit Start"]
  );
  assert.deepEqual(scanLinksForApp("admin", waitingPickup).map((row) => row.step), [
    "pack",
    "pickup",
    "deliver",
  ]);
  assert.deepEqual(
    scanLinksForApp("admin", labOnTheWay).map((row) => row.label),
    ["Scan Service Prep", "Scan Collection Start", "Scan Sample Received"]
  );
  assert.equal(
    scanStepTitle("radiology", "pickup"),
    "Scan Centre Check-In"
  );

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
      app: "customer",
      order: radiologyWaiting,
      step: "pickup",
    }),
    true
  );
  assert.equal(
    canUseScanDelivery({
      app: "customer",
      order: radiologyWaiting,
      step: "deliver",
    }),
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
