import test from "node:test";
import assert from "node:assert/strict";
import {
  attachConcernedPharmacy,
  partnerCanAccessJob,
  publicPartner,
} from "../server/partners.mjs";

test("partner records keep a staff-set collection split percent", () => {
  const row = publicPartner({
    id: "P-X",
    name: "A",
    kinds: ["lab"],
    partnerPercent: 70,
  });
  assert.equal(row.partnerPercent, 70);
  const fallback = publicPartner({ id: "P-Y", name: "B", kinds: ["lab"] });
  assert.equal(fallback.partnerPercent, 85);
});

test("partner sees claimed jobs and pending requests for their kind", () => {
  const labPartner = { id: "P-LAB-01", kinds: ["lab"] };
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "lab",
      partnerId: "P-LAB-01",
      trackStatus: "confirmed",
      partnerConfirmed: true,
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "medicine",
      partnerId: "P-LAB-01",
      trackStatus: "confirmed",
      partnerConfirmed: true,
    }),
    false
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "lab",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
      partnerConfirmed: false,
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "ambulance",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
    }),
    false
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "lab",
      trackStatus: "confirmed",
      partnerConfirmed: true,
      partnerId: "P-OTHER",
    }),
    false
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "lab",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
      partnerConfirmed: false,
      partnerId: "lal-pathlabs",
      preferredPartnerId: "lal-pathlabs",
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(labPartner, {
      kind: "lab",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
      partnerConfirmed: false,
      partnerId: "",
      preferredPartnerId: "metropolis",
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(
      { id: "P-RAD-01", kinds: ["radiology"] },
      {
        kind: "radiology",
        trackStatus: "requested",
        partnerConfirmStatus: "pending",
        partnerConfirmed: false,
        partnerId: "",
        preferredPartnerId: "rad-delhi",
      }
    ),
    true
  );
});

test("each partner app only sees its own service jobs", () => {
  const pharmacy = {
    id: "P-TEST-01",
    kinds: ["medicine", "lab", "radiology"],
  };
  assert.equal(
    partnerCanAccessJob(pharmacy, {
      kind: "medicine",
      partnerId: "P-TEST-01",
      trackStatus: "confirmed",
      partnerConfirmed: true,
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(pharmacy, {
      kind: "lab",
      partnerId: "P-TEST-01",
      trackStatus: "confirmed",
      partnerConfirmed: true,
    }),
    false
  );
  assert.equal(
    partnerCanAccessJob({ id: "P-LAB-01", kinds: ["lab"] }, {
      kind: "medicine",
      partnerId: "P-LAB-01",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
    }),
    false
  );
});

test("pharmacy partner sees unassigned medicine orders only for a tagged PIN", () => {
  const store = {
    id: "P-STORE-01",
    kinds: ["medicine"],
    role: "Pharmacy partner",
    outletId: "MH-OUT-CD",
    pins: ["110001"],
  };
  assert.equal(
    partnerCanAccessJob(store, {
      kind: "medicine",
      pinCode: "110001",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(store, {
      kind: "medicine",
      pinCode: "110016",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
    }),
    false
  );
});

test("pharmacy store keeps delivered PIN orders forever", () => {
  const store = {
    id: "P-STORE-01",
    kinds: ["medicine"],
    role: "Pharmacy partner",
    pins: ["110001"],
  };
  assert.equal(
    partnerCanAccessJob(store, {
      kind: "medicine",
      pinCode: "110001",
      trackStatus: "done",
      trackCompleted: true,
      checkDeliverAt: 1,
    }),
    true
  );
  assert.equal(
    partnerCanAccessJob(store, {
      kind: "medicine",
      pinCode: "110001",
      pharmacyPartnerId: "P-STORE-01",
      partnerId: "P-STORE-01",
      trackStatus: "done",
      trackCompleted: true,
    }),
    true
  );
});

test("new medicine orders are tagged to the PIN pharmacy store not the rider", () => {
  const tagged = attachConcernedPharmacy(
    { kind: "medicine", pinCode: "110001" },
    [
      { id: "P-MED-01", name: "Ravi Kumar", kinds: ["medicine"], role: "Medicine rider", pins: ["110001"] },
      { id: "P-STORE-01", name: "CP Pharmacy", kinds: ["medicine"], role: "Pharmacy partner", pins: ["110001"] },
    ]
  );
  assert.equal(tagged.pharmacyPartnerId, "P-STORE-01");
  assert.equal(tagged.pharmacyPartnerName, "CP Pharmacy");
});

test("delivery partner keeps completed jobs for 30 days only", () => {
  const rider = {
    id: "P-MED-01",
    kinds: ["medicine"],
    role: "Medicine rider",
    pins: ["110001"],
  };
  const now = 1_800_000_000_000;
  assert.equal(
    partnerCanAccessJob(
      rider,
      {
        kind: "medicine",
        pinCode: "110001",
        partnerId: "P-STORE-01",
        trackStatus: "on_the_way",
      },
      now
    ),
    true
  );
  assert.equal(
    partnerCanAccessJob(
      rider,
      {
        kind: "medicine",
        pinCode: "110001",
        deliveryPartnerId: "P-MED-01",
        trackStatus: "done",
        trackCompleted: true,
        checkDeliverAt: now - 10 * 24 * 60 * 60 * 1000,
      },
      now
    ),
    true
  );
  assert.equal(
    partnerCanAccessJob(
      rider,
      {
        kind: "medicine",
        pinCode: "110001",
        deliveryPartnerId: "P-MED-01",
        trackStatus: "done",
        trackCompleted: true,
        checkDeliverAt: now - 32 * 24 * 60 * 60 * 1000,
      },
      now
    ),
    false
  );
});
