import assert from "node:assert/strict";
import test from "node:test";
import {
  ambulanceJobOpen,
  ambulanceOfferFields,
  nearestAvailableAmbulance,
} from "./ambulanceDispatch.js";

const partners = [
  {
    id: "P-NEAR",
    name: "Near Ambulance",
    kinds: ["ambulance"],
    pins: ["110001"],
    team: [
      {
        id: "T-EM",
        name: "Ravi",
        mobile: "9810011111",
        role: "Emergency",
        status: "approved",
        profile: { ambulanceType: "emergency", vehicleNumber: "DL01AA1111" },
      },
      {
        id: "T-LS",
        name: "Aman",
        mobile: "9810012222",
        role: "Life support",
        status: "approved",
        profile: { ambulanceType: "life-support", vehicleNumber: "DL01BB2222" },
      },
    ],
  },
  {
    id: "P-FAR",
    name: "Far Ambulance",
    kinds: ["ambulance"],
    pins: ["122001"],
    team: [
      {
        id: "T-FAR",
        name: "Neha",
        mobile: "9810013333",
        role: "Emergency",
        status: "approved",
        profile: { ambulanceType: "emergency", vehicleNumber: "HR26CC3333" },
      },
    ],
  },
];

test("the customer is offered only the nearest free ambulance of that category", () => {
  const nearest = nearestAvailableAmbulance({
    partners,
    orders: [],
    category: "emergency",
    pin: "110001",
  });
  assert.equal(nearest.partnerId, "P-NEAR");
  assert.equal(nearest.vehicleNumber, "DL01AA1111");
  assert.equal(nearest.type, "emergency");
  const offer = ambulanceOfferFields(nearest);
  assert.equal(offer.partnerConfirmStatus, "pending");
  assert.equal(offer.partnerConfirmed, false);
  assert.equal(offer.trackStatus, "requested");
});

test("an engaged ambulance is not offered again", () => {
  const orders = [
    {
      kind: "ambulance",
      teamMemberId: "T-EM",
      vehicleNumber: "DL01AA1111",
      trackStatus: "requested",
      partnerConfirmStatus: "pending",
    },
  ];
  assert.equal(ambulanceJobOpen(orders[0]), true);
  const nearest = nearestAvailableAmbulance({
    partners,
    orders,
    category: "emergency",
    pin: "110001",
  });
  assert.equal(nearest.partnerId, "P-FAR");
  assert.equal(nearest.vehicleNumber, "HR26CC3333");
});

test("a finished trip frees the ambulance, and another category stays hidden", () => {
  const finished = nearestAvailableAmbulance({
    partners,
    orders: [
      {
        kind: "ambulance",
        teamMemberId: "T-EM",
        vehicleNumber: "DL01AA1111",
        trackStatus: "done",
        partnerConfirmStatus: "accepted",
      },
    ],
    category: "emergency",
    lat: 28.6139,
    lng: 77.209,
  });
  assert.equal(finished.vehicleNumber, "DL01AA1111");
  const life = nearestAvailableAmbulance({
    partners,
    orders: [],
    category: "life-support",
    pin: "110001",
  });
  assert.equal(life.vehicleNumber, "DL01BB2222");
  assert.equal(
    nearestAvailableAmbulance({ partners, orders: [], category: "patient-transport", pin: "110001" }),
    null
  );
});
