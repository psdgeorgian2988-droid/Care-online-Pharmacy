import assert from "node:assert/strict";
import test from "node:test";
import {
  ambulanceShareText,
  ambulanceTrackUrl,
  bookedFromDifferentPlace,
  whatsappShareHref,
} from "./ambulanceShare.js";

test("a family link follows the booked ambulance", () => {
  const order = { requestId: "MH-AMB-1", vehicleNumber: "DL01EM1001", startMode: "address" };
  assert.match(ambulanceTrackUrl(order), /#track\?id=MH-AMB-1$/);
  assert.match(ambulanceShareText(order), /DL01EM1001/);
  assert.match(whatsappShareHref("9876543210", "hello"), /wa\.me\/919876543210/);
  assert.equal(bookedFromDifferentPlace(order), true);
  assert.equal(bookedFromDifferentPlace({ pickupAddress: "Live location 28.1, 77.2" }), false);
});
