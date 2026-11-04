import assert from "node:assert/strict";
import test from "node:test";
import {
  ambulanceBookingSummary,
  ambulanceTypeLabel,
  urgentAmbulanceErrors,
} from "./ambulanceBooking.js";

test("an ambulance booking shows the customer, trip, type, and live location", () => {
  const summary = ambulanceBookingSummary({
    patientName: "Ravi",
    mobile: "9876543210",
    address: "14 Ring Road",
    pinCode: "110001",
    destinationName: "City Hospital",
    destinationAddress: "Sector 5",
    destinationPin: "110017",
    emergencyType: "life-support",
    lat: 28.6139,
    lng: 77.209,
    liveGps: true,
  });
  assert.equal(summary.name, "Ravi");
  assert.equal(summary.mobile, "9876543210");
  assert.match(summary.pickup, /Ring Road/);
  assert.match(summary.drop, /City Hospital/);
  assert.equal(summary.type, "Life support");
  assert.equal(ambulanceTypeLabel("patient-transport"), "Patient transport");
  assert.equal(summary.liveGps, true);
  assert.match(summary.geoHref, /28\.6139,77\.209/);
});

test("emergency booking needs a mobile number and a live location", () => {
  const missing = urgentAmbulanceErrors({ mobile: "123", liveGps: false });
  assert.ok(missing.mobile);
  assert.ok(missing.location);
  assert.ok(missing.destinationAddress);
  const ready = urgentAmbulanceErrors({
    mobile: "9876543210",
    lat: 28.61,
    lng: 77.2,
    liveGps: true,
    destinationAddress: "City Hospital",
  });
  assert.equal(Object.keys(ready).length, 0);
});

test("a PIN code can place the booking on the map", () => {
  const byPin = urgentAmbulanceErrors({
    mobile: "9876543210",
    startMode: "address",
    pickupAddress: "14 Ring Road",
    pinCode: "110001",
    lat: 28.63,
    lng: 77.22,
    liveGps: false,
    destinationAddress: "City Hospital",
  });
  assert.equal(Object.keys(byPin).length, 0);
  const pinOnly = urgentAmbulanceErrors({
    mobile: "9876543210",
    startMode: "here",
    pinCode: "110001",
    lat: 28.63,
    lng: 77.22,
    liveGps: false,
    destinationAddress: "City Hospital",
  });
  assert.ok(pinOnly.location);
});
