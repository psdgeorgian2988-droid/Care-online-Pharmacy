import test from "node:test";
import assert from "node:assert/strict";
import {
  applyResolvedPin,
  formatAddress,
  validateAddress,
  addressFromUnknown,
} from "./addressFields.js";

test("required address lines fail when empty, landmark stays optional", () => {
  const errors = validateAddress({});
  assert.equal(errors.houseNo.includes("House"), true);
  assert.equal(errors.society.includes("Society"), true);
  assert.equal(errors.city, undefined);
  assert.equal(errors.district, undefined);
  assert.equal(errors.state, undefined);
  assert.equal(errors.pinCode.includes("PIN"), true);
  assert.equal(errors.nearby, undefined);
});

test("city, district and state are not typed by the customer", () => {
  const errors = validateAddress({
    houseNo: "B-14",
    society: "Green Park Society",
    pinCode: "110016",
  });
  assert.equal(errors.pinCode.includes("PIN"), true);
  assert.equal(errors.city, undefined);
});

test("address is valid without a landmark", () => {
  const errors = validateAddress({
    houseNo: "B-14",
    society: "Green Park Society",
    area: "Hauz Khas",
    city: "New Delhi",
    district: "South Delhi",
    state: "Delhi",
    pinCode: "110016",
  });
  assert.deepEqual(errors, {});
});

test("complete address formats in the asked order", () => {
  assert.equal(
    formatAddress({
      houseNo: "B-14",
      society: "Green Park Society",
      area: "Hauz Khas",
      nearby: "Metro Gate 2",
      city: "New Delhi",
      district: "South Delhi",
      state: "Delhi",
      pinCode: "110016",
    }),
    "B-14, Green Park Society, Hauz Khas, Near Metro Gate 2, New Delhi, South Delhi, Delhi, 110016"
  );
});

test("old single-line address is kept in society/mohalla until the form is filled", () => {
  const next = addressFromUnknown({
    address: "Old saved line",
    pinCode: "110001",
  });
  assert.equal(next.society, "Old saved line");
  assert.equal(next.pinCode, "110001");
});

test("format omits landmark when it is left blank", () => {
  assert.equal(
    formatAddress({
      houseNo: "B-14",
      society: "Green Park Society",
      area: "Hauz Khas",
      city: "New Delhi",
      district: "South Delhi",
      state: "Delhi",
      pinCode: "110016",
    }),
    "B-14, Green Park Society, Hauz Khas, New Delhi, South Delhi, Delhi, 110016"
  );
});

test("PIN GPS locality does not replace society and landmark stays blank", () => {
  const next = applyResolvedPin(
    {
      houseNo: "B-14",
      society: "Green Park Society",
      city: "New Delhi",
      district: "South Delhi",
      state: "Delhi",
      pinCode: "110016",
    },
    { pinCode: "110016", locality: "Hauz Khas", pin: "110016" }
  );
  assert.equal(next.society, "Green Park Society");
  assert.equal(next.locality, "Hauz Khas");
  assert.equal(next.nearby, "");
  assert.equal(next.address.includes("Near"), false);
});

test("resolved PIN can fill city, district and state", () => {
  const next = applyResolvedPin(
    {
      houseNo: "B-14",
      society: "Green Park Society",
      pinCode: "400001",
    },
    {
      pinCode: "400001",
      area: "Fort",
      city: "Mumbai",
      district: "Mumbai",
      state: "Maharashtra",
    }
  );
  assert.equal(next.city, "Mumbai");
  assert.equal(next.district, "Mumbai");
  assert.equal(next.state, "Maharashtra");
  assert.equal(next.address.includes("Mumbai"), true);
});
