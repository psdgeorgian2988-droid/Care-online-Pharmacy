import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ICU_VENTILATOR_HOSPITALS,
  hospitalDestination,
  nearestIcuHospitals,
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
