import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { accountMatchesLogin, accountStoreWithout, isRemovedMobile, loginPinFromInput, mergeAccountStores } from "./accounts.mjs";

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

test("a wiped account file does not forget a saved registration", () => {
  const saved = mergeAccountStores([
    { accounts: [], removed: [] },
    {
      accounts: [{ mobile: "9876543210", name: "A", loginPin: "246810", updatedAt: "2026-11-11T00:00:00.000Z" }],
      removed: [],
    },
  ]);
  assert.deepEqual(
    saved.accounts.map((row) => row.mobile),
    ["9876543210"]
  );
  assert.equal(saved.accounts[0].loginPin, "246810");
  assert.deepEqual(saved.removed, []);
});

test("admin customer remove is a staff route", async () => {
  const source = await readFile(new URL("./handler.mjs", import.meta.url), "utf8");
  assert.match(source, /pathname === "\/api\/admin\/accounts\/remove"/);
  assert.match(source, /await removeAccount\(body\.mobile\)/);
});

test("address PIN is not the login password, and a family mobile can sign in", () => {
  assert.equal(loginPinFromInput({ pinCode: "110001", loginPin: "" }), "");
  assert.equal(loginPinFromInput({ loginPin: "246810" }), "246810");
  const account = {
    mobile: "9876543210",
    loginPin: "246810",
    familyMembers: [{ name: "Anita", mobile: "9810012346" }],
  };
  assert.equal(accountMatchesLogin(account, "9876543210", "246810"), true);
  assert.equal(accountMatchesLogin(account, "9810012346", "246810"), true);
  assert.equal(accountMatchesLogin(account, "9810012346", "110001"), false);
  assert.equal(accountMatchesLogin(account, "9000000000", "246810"), false);
});
