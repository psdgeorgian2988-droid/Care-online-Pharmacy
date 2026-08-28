import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLoginPin, pickLoginPin, profileLoginPin } from "./loginPin.js";

test("login PIN is six digits and falls back to the address PIN", () => {
  assert.equal(normalizeLoginPin("123456"), "123456");
  assert.equal(normalizeLoginPin("12-34-56"), "123456");
  assert.equal(normalizeLoginPin("12345"), "");
  assert.equal(profileLoginPin({ loginPin: "654321", pinCode: "110001" }), "654321");
  assert.equal(profileLoginPin({ pinCode: "110001" }), "110001");
  assert.equal(pickLoginPin({}, { loginPin: "778899" }), "778899");
  assert.equal(pickLoginPin({ loginPin: "112233" }, { loginPin: "778899" }), "112233");
});
