import test from "node:test";
import assert from "node:assert/strict";
import {
  HOLDER_REPORT_ID,
  householdReportPeople,
  personLabel,
  reportBelongsTo,
} from "./reportPeople.js";

test("household list is account holder then family members", () => {
  const people = householdReportPeople({
    name: "Anita Sharma",
    mobile: "9876543210",
    familyMembers: [
      { id: "fam-1", name: "Aarav Sharma", relation: "son" },
      { id: "fam-2", name: "Neha Sharma", relation: "spouse" },
    ],
  });
  assert.equal(people[0].id, HOLDER_REPORT_ID);
  assert.equal(people[0].name, "Anita Sharma");
  assert.equal(people[1].name, "Aarav Sharma");
  assert.equal(people[2].name, "Neha Sharma");
  assert.match(personLabel(people[1]), /Son/);
});

test("a logged-in family member only sees their own name", () => {
  const people = householdReportPeople(
    {
      name: "Anita Sharma",
      familyMembers: [
        { id: "fam-1", name: "Aarav Sharma", relation: "son" },
        { id: "fam-2", name: "Neha Sharma", relation: "spouse" },
      ],
    },
    { accountRole: "member", accountMemberId: "fam-1", name: "Aarav Sharma" }
  );
  assert.equal(people.length, 1);
  assert.equal(people[0].id, "fam-1");
});

test("saved reports filter by the selected member", () => {
  const aarav = { id: "r1", memberId: "fam-1", testName: "CBC" };
  const anita = { id: "r2", memberId: "self", testName: "LFT" };
  const legacy = { id: "r3", testName: "X-Ray Chest" };
  assert.equal(reportBelongsTo(aarav, "fam-1"), true);
  assert.equal(reportBelongsTo(anita, "fam-1"), false);
  assert.equal(reportBelongsTo(legacy, "self"), true);
  assert.equal(reportBelongsTo(legacy, "fam-1"), false);
});
