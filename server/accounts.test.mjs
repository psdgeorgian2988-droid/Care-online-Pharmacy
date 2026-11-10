import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { accountStoreWithout, isRemovedMobile } from "./accounts.mjs";

test("removing a customer drops the account and keeps that mobile hidden", () => {
  const next = accountStoreWithout(
    {
      accounts: [
        { mobile: "9876543210", name: "A" },
        { mobile: "9000000001", name: "B" },
      ],
      removed: [],
    },
    "9876543210"
  );
  assert.equal(next.ok, true);
  assert.deepEqual(
    next.store.accounts.map((row) => row.mobile),
    ["9000000001"]
  );
  assert.deepEqual(next.store.removed, ["9876543210"]);
  assert.equal(isRemovedMobile(next.store, "98765 43210"), true);
});

test("removing the same customer again does not duplicate the hidden mobile", () => {
  const next = accountStoreWithout(
    { accounts: [], removed: ["9876543210"] },
    "9876543210"
  );
  assert.deepEqual(next.store.removed, ["9876543210"]);
});

test("a short mobile cannot remove a customer", () => {
  const next = accountStoreWithout({ accounts: [], removed: [] }, "123");
  assert.equal(next.ok, false);
});

test("admin customer remove is a staff route", async () => {
  const source = await readFile(new URL("./handler.mjs", import.meta.url), "utf8");
  assert.match(source, /pathname === "\/api\/admin\/accounts\/remove"/);
  assert.match(source, /await removeAccount\(body\.mobile\)/);
});
