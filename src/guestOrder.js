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
