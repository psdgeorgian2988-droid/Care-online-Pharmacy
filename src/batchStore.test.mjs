import assert from "node:assert/strict";
import { test } from "node:test";
import {
  batchesForProduct,
  fallbackBatch,
  latestBatchForProduct,
  withPickedBatch,
} from "./batchStore.js";

test("a medicine without uploaded lots still gets a pickable batch number", () => {
  const medicine = { id: 1377, name: "MediHome Vitamin D3 60,000 IU" };
  const batch = fallbackBatch(medicine);
  assert.equal(batch.batchNo, "MH1377A");
  const options = batchesForProduct(1377, [], medicine);
  assert.equal(options[0].batchNo, "MH1377A");
});

test("checkout lines keep the selected batch number", () => {
  const item = withPickedBatch(
    { id: 1377, name: "MediHome Vitamin D3 60,000 IU", quantity: 1 },
    { id: "b1", productId: "1377", batchNo: "MH-VD3-2408", expiryDate: "2028-03-01" }
  );
  assert.equal(item.batchNo, "MH-VD3-2408");
  assert.equal(item.batchExpiryDate, "2028-03-01");
  assert.equal(
    latestBatchForProduct("1377", [
      { id: "b1", productId: "1377", batchNo: "MH-VD3-2408" },
    ])?.batchNo,
    "MH-VD3-2408"
  );
});
