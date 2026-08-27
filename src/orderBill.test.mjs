import test from "node:test";
import assert from "node:assert/strict";
import { billingPartyFor, buildOrderBill } from "./orderBill.js";
import { MEDIHOME_BILLING } from "./diagnosticPartners.js";

test("medicine bills use the PIN-assigned retail counter GST and DL", () => {
  const party = billingPartyFor({
    kind: "medicine",
    pinCode: "110001",
  });
  assert.equal(party.name, "Central Delhi Outlet");
  assert.match(party.gstin, /^07/);
  assert.match(party.dlNo, /^DL-/);
  assert.equal(party.licenseLabel, "DL No.");
});

test("lab bills use the assigned lab GST and licence", () => {
  const party = billingPartyFor({
    kind: "lab",
    partnerId: "lal-pathlabs",
    partner: "Lal PathLabs",
  });
  assert.equal(party.name, "Lal PathLabs");
  assert.equal(party.gstin, "07AAACL0582L1Z2");
  assert.match(party.dlNo, /LAB/);
});

test("imaging bills use the assigned centre GST and AERB licence", () => {
  const party = billingPartyFor({
    kind: "radiology",
    partner: "MediHome Imaging Centre - Gurgaon",
  });
  assert.equal(party.gstin, "06AAMHM1220G1Z4");
  assert.match(party.dlNo, /AERB/);
});

test("home care, psychologist, step-down and ambulance bills use MediHome GST", () => {
  for (const kind of ["homecare", "psychologist", "stepdown", "ambulance"]) {
    const party = billingPartyFor({ kind, pinCode: "110001" });
    assert.equal(party.gstin, MEDIHOME_BILLING.gstin);
    assert.equal(party.source, "medihome");
    assert.equal(party.dlNo, "");
  }
});

test("invoice lists medicines and payable total", () => {
  const bill = buildOrderBill({
    kind: "medicine",
    id: "1001",
    pinCode: "122001",
    fullName: "Riya Sharma",
    items: [{ name: "Paracetamol 650", price: 32, quantity: 2 }],
    total: 64,
    saleRupees: 64,
  });
  assert.equal(bill.seller.name, "Gurugram Outlet");
  assert.equal(bill.lines[0].amount, 64);
  assert.equal(bill.payable, 64);
  assert.match(bill.invoiceNo, /1001/);
});
