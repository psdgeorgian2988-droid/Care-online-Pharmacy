import { pickAddress } from "./addressFields.js";
import { emptyAddress } from "./addressFields.js";
import { emptyPerson, pickPerson } from "./personFields.js";

export function guestDraftFromOrder(source = {}) {
  const name = String(
    source.name || source.patientName || source.fullName || ""
  ).trim();
  const mobile = String(source.mobile || source.mobileNumber || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  return {
    name,
    mobile,
    ...emptyPerson(),
    ...emptyAddress(),
    ...pickPerson(source),
    ...pickAddress(source),
  };
}

export function addressReadyForAccount(source = {}) {
  const addr = pickAddress(source);
  return Boolean(
    addr.houseNo &&
      addr.society &&
      /^\d{6}$/.test(addr.pinCode) &&
      addr.area &&
      addr.city &&
      addr.district &&
      addr.state
  );
}

export const GUEST_REGISTER_HEADLINE =
  "Register for year-round discounts, offers and MediHome points.";

export const GUEST_REGISTER_BENEFITS = [
  "Year-round discounts on medicines and home services",
  "Member offers on your orders",
  "MediHome points for family members, referrals, webinars and quizzes",
  "Saved name, mobile and address for faster checkout",
  "Book for family members from your account",
];

export function missingGuestRegisterFields(source = {}) {
  const draft = guestDraftFromOrder(source);
  const missing = [];
  if (!draft.name) missing.push("name");
  if (!/^[6-9]\d{9}$/.test(draft.mobile)) missing.push("mobile");
  if (!draft.gender) missing.push("gender");
  if (!draft.dob) missing.push("dob");
  if (!addressReadyForAccount(draft)) missing.push("address");
  return { draft, missing };
}

export function guestRegisterPlan(source = {}) {
  const { draft, missing } = missingGuestRegisterFields(source);
  const needsOrderContact = missing.some(
    (key) => key === "name" || key === "mobile" || key === "address"
  );
  const needsPerson = missing.includes("gender") || missing.includes("dob");
  return {
    draft,
    missing,
    needsOrderContact,
    needsPerson,
    canSaveNow: !needsOrderContact && !needsPerson,
  };
}
