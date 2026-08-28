import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ICU_VENTILATOR_HOSPITALS,
  hospitalDestination,
  nearestIcuHospitals,
  persistHospitalDestination,
  typedHospitalDestination,
  validateAmbulanceDrop,
} from "./icuHospitals.js";

test("every suggested hospital is listed as ICU with ventilator", () => {
  assert.equal(ICU_VENTILATOR_HOSPITALS.length > 8, true);
  for (const row of ICU_VENTILATOR_HOSPITALS) {
    assert.equal(row.icu, true, row.name);
    assert.equal(row.ventilator, true, row.name);
    assert.equal(row.facilities.includes("ICU"), true, row.name);
    assert.equal(row.facilities.includes("Ventilator"), true, row.name);
    assert.match(row.pin, /^\d{6}$/);
    assert.equal(Number.isFinite(row.lat), true, row.name);
    assert.equal(Number.isFinite(row.lng), true, row.name);
  }
});

test("Dwarka PIN ranks nearby Dwarka hospitals ahead of Gurugram", () => {
  const rows = nearestIcuHospitals({
    lat: 28.5921,
    lng: 77.046,
    pin: "110075",
    limit: 3,
  });
  assert.equal(rows.length, 3);
  assert.equal(
    rows.some((row) => /dwarka/i.test(`${row.name} ${row.area}`)),
    true
  );
  assert.equal(rows[0].distanceKm < rows.at(-1).distanceKm, true);
  assert.equal(rows[0].icu, true);
  assert.equal(rows[0].ventilator, true);
});

test("Gurugram pickup prefers Medanta or Fortis over East Delhi hospitals", () => {
  const rows = nearestIcuHospitals({
    lat: 28.4595,
    lng: 77.0266,
    pin: "122001",
    limit: 3,
  });
  const names = rows.map((row) => row.name).join(" ");
  assert.match(names, /Medanta|Fortis|Artemis/);
  assert.equal(rows[0].city, "Gurugram");
});

test("selected hospital becomes the ambulance drop destination", () => {
  const [top] = nearestIcuHospitals({ lat: 28.6139, lng: 77.209, pin: "110001" });
  const dest = hospitalDestination(top);
  assert.equal(dest.destinationId, top.id);
  assert.equal(dest.destinationName, top.name);
  assert.equal(dest.destinationPin, top.pin);
  assert.match(dest.destinationFacilities, /ICU/);
  assert.match(dest.destinationFacilities, /Ventilator/);
});

test("customer can type any hospital name and address as the drop", () => {
  const dest = typedHospitalDestination({
    name: "Holy Family Hospital",
    address: "Okhla Road, New Delhi 110025",
  });
  assert.equal(dest.destinationId, "");
  assert.equal(dest.destinationName, "Holy Family Hospital");
  assert.equal(dest.destinationAddress, "Okhla Road, New Delhi 110025");
  assert.equal(dest.destinationFacilities, "");
});

test("hospital name keeps spaces between words while typing", () => {
  const dest = typedHospitalDestination({
    name: "Holy Family ",
    address: "Okhla Road, ",
  });
  assert.equal(dest.destinationName, "Holy Family ");
  assert.equal(dest.destinationAddress, "Okhla Road, ");
});

test("hospital name is not cut off by length", () => {
  const name =
    "All India Institute of Medical Sciences New Delhi Cardiothoracic Centre";
  const dest = typedHospitalDestination({ name, address: "Ansari Nagar" });
  assert.equal(dest.destinationName, name);
  assert.equal(dest.destinationName.length > 40, true);
});

test("typed drop keeps a 6-digit PIN from the address or the PIN field", () => {
  const fromAddress = typedHospitalDestination({
    name: "Holy Family Hospital",
    address: "Okhla Road, New Delhi 110025",
  });
  assert.equal(fromAddress.destinationPin, "110025");
  const fromField = typedHospitalDestination({
    name: "Holy Family Hospital",
    address: "Okhla Road, New Delhi",
    pin: "110025",
  });
  assert.equal(fromField.destinationPin, "110025");
});

test("ambulance drop requires hospital name, address and PIN", () => {
  const empty = validateAmbulanceDrop({});
  assert.equal(empty.destinationName, "Enter the hospital name.");
  assert.equal(empty.destinationAddress, "Enter the drop address.");
  assert.equal(empty.destinationPin, "Enter the 6-digit drop PIN Code.");
  const ok = validateAmbulanceDrop({
    destinationName: "Holy Family Hospital",
    destinationAddress: "Okhla Road, New Delhi",
    destinationPin: "110025",
  });
  assert.deepEqual(ok, {});
});

test("saving a hospital name trims edges but keeps the full wording", () => {
  const saved = persistHospitalDestination({
    name: "  Holy Family Hospital Okhla  ",
    address: "  Okhla Road, New Delhi 110025  ",
  });
  assert.equal(saved.destinationName, "Holy Family Hospital Okhla");
  assert.equal(saved.destinationAddress, "Okhla Road, New Delhi 110025");
  assert.equal(saved.destinationPin, "110025");
});
