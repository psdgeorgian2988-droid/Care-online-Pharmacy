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
if (!globalThis.sessionStorage) globalThis.sessionStorage = memoryStore();

const { partnerLogout, partnerSession, setPartnerSession } = await import("./partnerApi.js");
const { setStaffToken, staffLogout, staffToken } = await import("./adminApi.js");
const { PROFILE_KEY, LOGIN_SESSION_KEY, logoutSession, readLoginSession, writeLoginSession } =
  await import("./authSession.js");

function seedAllRoles() {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      name: "Asha",
      mobile: "9876543210",
      creatorMobile: "9876543210",
    })
  );
  writeLoginSession({
    name: "Asha",
    mobile: "9876543210",
    creatorMobile: "9876543210",
  });
  setPartnerSession("partner-token", { id: "P-LAB", name: "Lab Desk", kinds: ["lab"] });
  setStaffToken("staff-token");
}

test("partner logout clears only the partner session", () => {
  seedAllRoles();
  partnerLogout();
  assert.deepEqual(partnerSession(), { token: "", partner: null });
  assert.equal(staffToken(), "staff-token");
  assert.equal(readLoginSession()?.mobile, "9876543210");
  assert.equal(localStorage.getItem(LOGIN_SESSION_KEY), "1");
});

test("staff logout clears only the admin session", () => {
  seedAllRoles();
  staffLogout();
  assert.equal(staffToken(), "");
  assert.equal(partnerSession().token, "partner-token");
  assert.equal(partnerSession().partner?.id, "P-LAB");
  assert.equal(readLoginSession()?.mobile, "9876543210");
});

test("customer logout leaves partner and admin sessions", () => {
  seedAllRoles();
  logoutSession();
  assert.equal(readLoginSession(), null);
  assert.equal(partnerSession().token, "partner-token");
  assert.equal(staffToken(), "staff-token");
});
