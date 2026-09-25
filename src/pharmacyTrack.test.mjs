import assert from "node:assert/strict";
import { test } from "node:test";
import {
  jobsForPharmacyDeskTab,
  nextPharmacyStep,
  pharmacyApprovedFields,
  pharmacyDeskTab,
  pharmacyDeliveredFields,
  pharmacyPackedFields,
  pharmacyReturnCollectedFields,
  pharmacyReturnRequestedFields,
  returnCollectError,
  returnRequestError,
  pharmacyPickedUpFields,
  pharmacyPlacedFields,
  pharmacyStatusLabel,
  pharmacyTrackKey,
} from "./pharmacyTrack.js";

test("pharmacy status reads as placed, approved, packed, picked up, on the way, delivered", () => {
  assert.equal(pharmacyStatusLabel("requested"), "Order placed");
  assert.equal(pharmacyStatusLabel("confirmed"), "Approved by pharmacist");
  assert.equal(pharmacyStatusLabel("packed"), "Packed");
  assert.equal(pharmacyStatusLabel("picked_up"), "Picked up");
  assert.equal(pharmacyStatusLabel("on_the_way"), "On the way");
  assert.equal(pharmacyStatusLabel("done"), "Delivered");
  assert.equal(nextPharmacyStep("requested"), "confirmed");
  assert.equal(nextPharmacyStep("confirmed"), "packed");
  assert.equal(nextPharmacyStep("packed"), "picked_up");
  assert.equal(nextPharmacyStep("picked_up"), "on_the_way");
  assert.equal(nextPharmacyStep("on_the_way"), "done");
});

test("pharmacy track key follows pharmacist approve, pack, pickup, and delivery", () => {
  assert.equal(pharmacyTrackKey(pharmacyPlacedFields()), "requested");
  assert.equal(pharmacyTrackKey(pharmacyApprovedFields()), "confirmed");
  assert.equal(pharmacyTrackKey(pharmacyPackedFields()), "packed");
  assert.equal(
    pharmacyTrackKey({ trackStatus: "picked_up", checkPickupAt: 1 }),
    "picked_up"
  );
  assert.equal(
    pharmacyTrackKey({ trackStatus: "on_the_way", checkPickupAt: 1 }),
    "on_the_way"
  );
  assert.equal(
    pharmacyTrackKey({ trackStatus: "done", trackCompleted: true }),
    "done"
  );
});

test("pharmacy desk tabs split new, approved, packed, picked, and delivered", () => {
  assert.equal(pharmacyDeskTab(pharmacyPlacedFields()), "new");
  assert.equal(pharmacyDeskTab(pharmacyApprovedFields()), "approved");
  assert.equal(pharmacyDeskTab(pharmacyPackedFields()), "packed");
  assert.equal(pharmacyDeskTab(pharmacyPickedUpFields()), "picked");
  assert.equal(pharmacyDeskTab(pharmacyDeliveredFields()), "delivered");
  assert.equal(
    pharmacyDeskTab({
      ...pharmacyDeliveredFields(),
      ...pharmacyReturnRequestedFields(1, {
        photo: { fileData: "data:image/jpeg;base64,abc" },
      }),
    }),
    "returns"
  );
  assert.deepEqual(
    jobsForPharmacyDeskTab(
      [
        { id: "n1", ...pharmacyPlacedFields() },
        { id: "a1", ...pharmacyApprovedFields() },
        { id: "p1", ...pharmacyPackedFields() },
      ],
      "approved"
    ).map((row) => row.id),
    ["a1"]
  );
});

test("return medicine requires a customer photo and a collection photo", () => {
  assert.equal(
    returnRequestError(pharmacyReturnRequestedFields(1, { reason: "unused" })),
    "Upload a photo of the medicine to request a return."
  );
  assert.equal(
    returnRequestError(
      pharmacyReturnRequestedFields(1, {
        reason: "unused",
        photo: { fileData: "data:image/jpeg;base64,abc" },
      })
    ),
    ""
  );
  assert.equal(
    returnCollectError(pharmacyReturnCollectedFields(1)),
    "Capture a photo while collecting the return medicine."
  );
  assert.equal(
    returnCollectError(
      pharmacyReturnCollectedFields(1, {
        photo: { fileData: "data:image/jpeg;base64,xyz" },
      })
    ),
    ""
  );
});
