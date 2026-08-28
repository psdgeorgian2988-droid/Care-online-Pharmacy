import {
  genderLabel,
  normalizeMobile,
  pickFamilyMembers,
  relationLabel,
} from "./personFields.js";

export const HOLDER_ROLE = "holder";
export const MEMBER_ROLE = "member";

export function holderActor(profile = {}) {
  return {
    role: HOLDER_ROLE,
    memberId: "",
    name: String(profile.name || "").trim(),
    mobile: normalizeMobile(profile.mobile),
  };
}

export function isHolderActor(actor) {
  return !actor || actor.role !== MEMBER_ROLE;
}

export function findAccountActor(profile = {}, mobile) {
  const wanted = normalizeMobile(mobile);
  if (!wanted) return null;
  if (normalizeMobile(profile.mobile) === wanted) return holderActor(profile);
  const hit = pickFamilyMembers(profile).find(
    (row) =>
      normalizeMobile(row.mobile) === wanted && !row.useAccountMobile
  );
  if (!hit) return null;
  return {
    role: MEMBER_ROLE,
    memberId: hit.id,
    name: hit.name,
    mobile: wanted,
  };
}

export function profileForActor(profile = {}, actor = null) {
  if (isHolderActor(actor)) {
    return {
      ...profile,
      accountRole: HOLDER_ROLE,
      accountMemberId: "",
    };
  }
  const member = pickFamilyMembers(profile).find(
    (row) => row.id === actor.memberId
  );
  if (!member) {
    return { ...profile, accountRole: HOLDER_ROLE, accountMemberId: "" };
  }
  return {
    ...profile,
    name: member.name,
    mobile: member.mobile,
    gender: member.gender,
    dob: member.dob,
    age: member.age,
    familyMembers: [],
    accountRole: MEMBER_ROLE,
    accountMemberId: member.id,
    accountRelation: member.relation,
    accountHolderName: String(profile.name || "").trim(),
    accountHolderMobile: normalizeMobile(profile.mobile),
  };
}

function asNode(row, extra = {}) {
  return {
    id: row.id,
    name: row.name,
    relation: row.relation,
    relationLabel: extra.relationLabel || relationLabel(row.relation),
    gender: row.gender || "",
    genderLabel: genderLabel(row.gender),
    age: row.age || "",
    mobile: normalizeMobile(row.mobile),
    isHolder: Boolean(extra.isHolder),
  };
}

export function familyTreeLayout(profile = {}) {
  const members = pickFamilyMembers(profile);
  const of = (value) =>
    members.filter((row) => row.relation === value).map((row) => asNode(row));
  return {
    holder: asNode(
      {
        id: "self",
        name: String(profile.name || "").trim() || "Account Holder",
        relation: "holder",
        gender: profile.gender || "",
        age: profile.age || "",
        mobile: profile.mobile,
      },
      { isHolder: true, relationLabel: "Account Holder" }
    ),
    spouse: of("spouse"),
    children: [...of("son"), ...of("daughter")],
    parents: [...of("father"), ...of("mother")],
    grandparents: [...of("grandfather"), ...of("grandmother")],
  };
}
