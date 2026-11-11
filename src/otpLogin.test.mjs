import assert from "node:assert/strict";
import { test } from "node:test";
import { accountProfileFromLogin } from "./otpLogin.js";

test("delivery address becomes the profile address after OTP login", () => {
  const profile = accountProfileFromLogin({
    mobile: "9876543210",
    account: { mobile: "9876543210", name: "Asha", email: "asha@medihome.in" },
    delivery: {
      name: "Asha",
      mobile: "9876543210",
      houseNo: "12",
      society: "Green Park",
      area: "Saket",
      city: "Delhi",
      district: "South Delhi",
      state: "Delhi",
      pinCode: "110017",
    },
  });
  assert.equal(profile.isGuest, false);
  assert.equal(profile.houseNo, "12");
  assert.equal(profile.pinCode, "110017");
  assert.equal(profile.city, "Delhi");
  assert.match(profile.address, /Green Park/);
});
