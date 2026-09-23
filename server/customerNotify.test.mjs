import assert from "node:assert/strict";
import { test } from "node:test";
import { alreadyNotifiedCustomer } from "./customerNotify.mjs";

test("does not stack unread slot-offer notices for the same order", () => {
  assert.equal(
    alreadyNotifiedCustomer(
      [
        {
          mobile: "9654222901",
          orderId: "MH-RAD-1",
          type: "slot_offer",
          readAt: null,
        },
      ],
      "9654222901",
      "MH-RAD-1",
      "slot_offer"
    ),
    true
  );
  assert.equal(
    alreadyNotifiedCustomer(
      [
        {
          mobile: "9654222901",
          orderId: "MH-RAD-1",
          type: "slot_offer",
          readAt: Date.now(),
        },
      ],
      "9654222901",
      "MH-RAD-1",
      "slot_offer"
    ),
    false
  );
});
