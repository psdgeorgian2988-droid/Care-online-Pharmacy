import test from "node:test";
import assert from "node:assert/strict";
import { chooseDetectedPin, locationErrorMessage } from "./pinLocation.js";
import { resolvePinFromLocation } from "../server/pincodes.mjs";

test("verified map postcode wins over a nearby wrong centroid PIN", () => {
  const chosen = chooseDetectedPin({
    postcode: "110001",
    nearest: { pin: "110055", distanceKm: 0.6 },
  });
  assert.deepEqual(chosen, { pin: "110001", source: "postcode" });
});

test("GPS nearest PIN is used when the map has no postcode", () => {
  const chosen = chooseDetectedPin({
    postcode: "",
    nearest: { pinCode: "124146", distanceKm: 1.2 },
  });
  assert.deepEqual(chosen, { pin: "124146", source: "nearest" });
});

test("Dwarka Sector 13 resolves to 110078 by area name, not Delhi Cantt centroid", () => {
  const found = resolvePinFromLocation(28.5921, 77.046, {
    area: "Dwarka Sector 13",
    suburb: "Dwarka Sector 13",
    postcode: "110010",
  });
  assert.equal(found.pin, "110078");
  assert.equal(found.source, "area");
});

test("Connaught Place postcode keeps 110001", () => {
  const found = resolvePinFromLocation(28.6315, 77.2167, {
    postcode: "110001",
    area: "Connaught Place",
  });
  assert.equal(found.pin, "110001");
  assert.equal(["postcode", "area"].includes(found.source), true);
});

test("location errors tell the user to turn GPS on", () => {
  assert.match(
    locationErrorMessage({ code: "OS-PLUG-GLOC-0007", message: "Location services are not enabled." }),
    /Turn on Location/
  );
  assert.match(
    locationErrorMessage({ code: "OS-PLUG-GLOC-0010", message: "Could not obtain location in time." }),
    /GPS/
  );
  assert.match(
    locationErrorMessage({ code: "OS-PLUG-GLOC-0003", message: "Location permission request was denied." }),
    /Allow location/
  );
  assert.match(
    locationErrorMessage({ code: "OS-PLUG-GLOC-0018", message: "Location permissions are not declared in manifest." }),
    /Allow location/
  );
  assert.match(
    locationErrorMessage({
      message:
        "No GPS fix yet. On an Android emulator, set a location under Extended controls → Location, then try again. Or enter the PIN Code.",
    }),
    /emulator/i
  );
});
