import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MEMBER_ROLE,
  findAccountActor,
  familyTreeLayout,
  profileForActor,
} from "./familyAccount.js";
import { relationLabel } from "./personFields.js";

const profile = {
  name: "Anita Sharma",
  mobile: "9876543210",
  gender: "F",
  age: "42",
  familyMembers: [
    {
      id: "fam-spouse",
      name: "Rohit Sharma",
      relation: "spouse",
      gender: "M",
      age: "44",
      mobile: "9876501111",
    },
    {
      id: "fam-son",
      name: "Aarav Sharma",
      relation: "son",
      gender: "M",
      age: "8",
      mobile: "9876502222",
    },
    {
      id: "fam-gf",
      name: "Hari Sharma",
      relation: "grandfather",
      gender: "M",
      age: "78",
      useAccountMobile: true,
    },
    {
      id: "fam-gm",
      name: "Lata Sharma",
      relation: "grandmother",
      gender: "F",
      age: "75",
      mobile: "9876503333",
    },
  ],
};

test("account holder login matches the creating person's mobile", () => {
  const actor = findAccountActor(profile, "9876543210");
  assert.equal(actor.role, "holder");
  assert.equal(actor.name, "Anita Sharma");
});

test("a family member with their own mobile opens only their details", () => {
  const actor = findAccountActor(profile, "9876502222");
  assert.equal(actor.role, MEMBER_ROLE);
  assert.equal(actor.memberId, "fam-son");
  const scoped = profileForActor(profile, actor);
  assert.equal(scoped.name, "Aarav Sharma");
  assert.equal(scoped.mobile, "9876502222");
  assert.deepEqual(scoped.familyMembers, []);
  assert.equal(scoped.accountRelation, "son");
});

test("a member using the account holder's mobile stays on the holder login", () => {
  const actor = findAccountActor(profile, "9876543210");
  assert.equal(actor.role, "holder");
});

test("family tree groups grandparents as Grand Father and Grand Mother", () => {
  assert.equal(relationLabel("grandfather"), "Grand Father");
  assert.equal(relationLabel("grandmother"), "Grand Mother");
  const tree = familyTreeLayout(profile);
  assert.equal(tree.holder.name, "Anita Sharma");
  assert.equal(tree.spouse[0].name, "Rohit Sharma");
  assert.equal(tree.children[0].name, "Aarav Sharma");
  assert.deepEqual(
    tree.grandparents.map((row) => row.relationLabel),
    ["Grand Father", "Grand Mother"]
  );
});
