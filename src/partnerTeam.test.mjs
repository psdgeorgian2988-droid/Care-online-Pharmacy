import test from "node:test";
import assert from "node:assert/strict";
import {
  approvedTeam,
  approvedTeamMember,
  newTeamMember,
  reviewedTeamMember,
  teamFrom,
  teamStatusLabel,
} from "./partnerTeam.js";

test("a new team member stays pending until admin reviews the profile", () => {
  const member = newTeamMember(
    {
      name: "Ravi Kumar",
      mobile: "98 7654 3210",
      status: "approved",
      profile: { qualification: "DMLT", email: "ravi@lab.test" },
    },
    "T-1",
    100
  );
  assert.equal(member.status, "pending");
  assert.equal(member.mobile, "9876543210");
  assert.equal(member.profile.qualification, "DMLT");
  assert.equal(member.profile.email, "ravi@lab.test");
  assert.equal(approvedTeam([member]).length, 0);
  const approved = reviewedTeamMember(member, "approved", "", 200);
  assert.equal(approved.status, "approved");
  assert.equal(approvedTeamMember({ team: [approved] }, "T-1")?.name, "Ravi Kumar");
  assert.equal(approvedTeamMember({ team: [member] }, "T-1"), null);
});

test("team list drops unnamed rows and keeps review state", () => {
  const team = teamFrom([
    { id: "T-1", name: "A" },
    { id: "T-2", name: "Neha Singh", status: "rejected", reviewNote: "Upload Aadhaar" },
  ]);
  assert.equal(team.length, 1);
  assert.equal(team[0].status, "rejected");
  assert.equal(teamStatusLabel(team[0].status), "Not approved");
  assert.equal(teamStatusLabel("pending"), "Pending admin approval");
});
