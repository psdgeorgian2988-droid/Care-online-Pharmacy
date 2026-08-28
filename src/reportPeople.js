import { pickFamilyMembers, relationLabel } from "./personFields.js";
import { MEMBER_ROLE } from "./familyAccount.js";

export const HOLDER_REPORT_ID = "self";

export function householdReportPeople(profile = {}, session = null) {
  const holderName = String(profile.name || "").trim();
  const holder = {
    id: HOLDER_REPORT_ID,
    name: holderName || "Account Holder",
    relationLabel: "Account Holder",
  };
  const members = pickFamilyMembers(profile)
    .filter((row) => String(row.name || "").trim())
    .map((row) => ({
      id: String(row.id),
      name: String(row.name).trim(),
      relationLabel: relationLabel(row.relation) || "Family Member",
    }));

  if (session?.accountRole === MEMBER_ROLE && session.accountMemberId) {
    const mine =
      members.find((row) => row.id === session.accountMemberId) || {
        id: String(session.accountMemberId),
        name: String(session.name || "").trim() || "Family Member",
        relationLabel: relationLabel(session.accountRelation) || "Family Member",
      };
    return [mine];
  }

  const list = [];
  if (holderName || members.length) list.push(holder);
  list.push(...members);
  if (!list.length) {
    return [{ id: HOLDER_REPORT_ID, name: "Myself", relationLabel: "" }];
  }
  return list;
}

export function personLabel(person) {
  if (!person) return "";
  return person.relationLabel
    ? `${person.name} (${person.relationLabel})`
    : person.name;
}

export function reportBelongsTo(item, memberId) {
  const wanted = String(memberId || "");
  if (!wanted) return true;
  const saved = String(item?.memberId || "");
  if (saved) return saved === wanted;
  return wanted === HOLDER_REPORT_ID;
}
