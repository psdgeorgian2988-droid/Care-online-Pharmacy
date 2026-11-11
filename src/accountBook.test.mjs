import assert from "node:assert/strict";
import { test } from "node:test";

function memoryStore() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

if (!globalThis.localStorage) globalThis.localStorage = memoryStore();

const { findRememberedAccount, rememberAccount } = await import("./accountBook.js");
const { logoutSession, PROFILE_KEY } = await import("./authSession.js");

test("logout keeps the registered mobile so the same person can sign in again", () => {
  localStorage.clear();
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      name: "Pradeep Singh",
      mobile: "9810011100",
      creatorMobile: "9810011100",
      loginPin: "246810",
      familyMembers: [{ id: "fam-1", name: "Anita Singh", mobile: "9810012346", relation: "spouse" }],
    })
  );
  logoutSession();
  const holder = findRememberedAccount("9810011100");
  const member = findRememberedAccount("9810012346");
  assert.equal(holder?.profile?.name, "Pradeep Singh");
  assert.equal(holder?.profile?.loginPin, "246810");
  assert.equal(member?.actor?.role, "member");
  assert.equal(member?.profile?.loginPin, "246810");
  assert.equal(JSON.parse(localStorage.getItem(PROFILE_KEY)).mobile, "9810011100");
});

test("a mobile saved with the country code still matches the 10 digits typed at login", () => {
  localStorage.clear();
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      name: "Asha Singh",
      mobile: "+91 98100 11100",
      loginPin: "246810",
      pinCode: "110001",
    })
  );
  logoutSession();
  const found = findRememberedAccount("9810011100");
  assert.equal(found?.profile?.name, "Asha Singh");
  assert.equal(found?.profile?.loginPin, "246810");
  assert.equal(found?.profile?.mobile, "9810011100");
});
