import test from "node:test";
import assert from "node:assert/strict";
import {
  accountCreatorMobile,
  ageFromDob,
  daysInMonth,
  joinIsoDate,
  RELATION_OPTIONS,
  normalizeRelation,
  relationLabel,
  pickFamilyMember,
  pickFamilyMembers,
  pickPerson,
  splitIsoDate,
  validateFamilyMembers,
  validatePerson,
} from "./personFields.js";

function yearsAgoIso(years, extraDays = 0) {
  const today = new Date();
  const date = new Date(
    today.getFullYear() - years,
    today.getMonth(),
    today.getDate() + extraDays
  );
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

test("date, month and year join into an ISO date of birth", () => {
  assert.deepEqual(splitIsoDate("2018-08-28"), {
    day: "28",
    month: "8",
    year: "2018",
  });
  assert.equal(joinIsoDate("28", "8", "2018"), "2018-08-28");
  assert.equal(joinIsoDate("31", "2", "2026"), "");
  assert.equal(daysInMonth("2", "2024"), 29);
  assert.equal(daysInMonth("2", "2025"), 28);
});

test("gender and date of birth are required on register", () => {
  const errors = validatePerson({});
  assert.equal(errors.gender.includes("Male"), true);
  assert.equal(errors.dob.includes("date of birth"), true);
  assert.equal(errors.age, undefined);
});

test("male/female and a valid date of birth pass", () => {
  assert.deepEqual(validatePerson({ gender: "M", dob: yearsAgoIso(34) }), {});
  assert.deepEqual(validatePerson({ gender: "Female", dob: yearsAgoIso(8) }), {});
});

test("age is calculated from date of birth", () => {
  assert.equal(ageFromDob(yearsAgoIso(34)), "34");
  assert.equal(pickPerson({ gender: "F", dob: yearsAgoIso(8) }).age, "8");
});

test("future or impossible dates of birth fail", () => {
  const tomorrow = yearsAgoIso(0, 1);
  assert.equal(Boolean(validatePerson({ gender: "F", dob: tomorrow }).dob), true);
  assert.equal(Boolean(validatePerson({ gender: "M", dob: "1890-01-01" }).dob), true);
  assert.equal(Boolean(validatePerson({ gender: "M", dob: "not-a-date" }).dob), true);
});

test("family members can be added with male/female and date of birth", () => {
  assert.deepEqual(validateFamilyMembers({ familyMembers: [] }), {});
  const errors = validateFamilyMembers({
    familyMembers: [{ name: "", relation: "son", gender: "", dob: "" }],
  });
  assert.equal(Boolean(errors["familyMembers.0.name"]), true);
  assert.equal(Boolean(errors["familyMembers.0.gender"]), true);
  assert.equal(Boolean(errors["familyMembers.0.dob"]), true);
  assert.equal(Boolean(errors["familyMembers.0.mobile"]), true);
  assert.deepEqual(
    validateFamilyMembers({
      familyMembers: [
        {
          name: "Aarav",
          relation: "son",
          gender: "M",
          dob: yearsAgoIso(8),
          mobile: "9876501234",
        },
      ],
    }),
    {}
  );
});

test("family members without a mobile use the account creator's number", () => {
  const account = {
    mobile: "9876543210",
    creatorMobile: "9876543210",
    familyMembers: [
      { name: "Aarav", relation: "son", gender: "M", dob: yearsAgoIso(8) },
    ],
  };
  assert.deepEqual(validateFamilyMembers(account), {});
  const [aarav] = pickFamilyMembers(account);
  assert.equal(aarav.mobile, "9876543210");
  assert.equal(aarav.useAccountMobile, true);
  assert.deepEqual(
    validateFamilyMembers({
      mobile: "9876543210",
      familyMembers: [
        {
          name: "Aarav",
          relation: "son",
          gender: "M",
          dob: yearsAgoIso(8),
          useAccountMobile: true,
        },
      ],
    }),
    {}
  );
});

test("account creator mobile stays the original number", () => {
  assert.equal(
    accountCreatorMobile({ mobile: "9876500000" }, { creatorMobile: "9876543210" }),
    "9876543210"
  );
  assert.equal(
    accountCreatorMobile({ mobile: "9876500000" }, { mobile: "9876543210" }),
    "9876543210"
  );
  const own = pickFamilyMember(
    { name: "Aarav", mobile: "9876501234", useAccountMobile: false },
    0,
    "9876543210"
  );
  assert.equal(own.mobile, "9876501234");
  assert.equal(own.useAccountMobile, false);
});

test("family relation options are spouse, children, parents and grandparents", () => {
  assert.deepEqual(
    RELATION_OPTIONS.map((row) => row.value),
    [
      "spouse",
      "son",
      "daughter",
      "mother",
      "father",
      "grandmother",
      "grandfather",
    ]
  );
  assert.equal(normalizeRelation("family"), "");
  assert.equal(normalizeRelation("brother"), "");
  assert.equal(normalizeRelation("Grand Mother"), "grandmother");
  assert.equal(normalizeRelation("Grand Father"), "grandfather");
  assert.equal(relationLabel("grandmother"), "Grand Mother");
  assert.equal(relationLabel("grandfather"), "Grand Father");
  assert.equal(normalizeRelation("spouse"), "spouse");
  assert.equal(
    validateFamilyMembers({
      familyMembers: [
        {
          name: "Aarav",
          relation: "family",
          gender: "M",
          dob: yearsAgoIso(8),
          mobile: "9876501234",
        },
      ],
    })["familyMembers.0.relation"],
    "Select a relation."
  );
});

test("pickPerson keeps M or F and calculated age from date of birth", () => {
  const row = pickPerson({ gender: "female", dob: yearsAgoIso(34) });
  assert.equal(row.gender, "F");
  assert.equal(row.dob, yearsAgoIso(34));
  assert.equal(row.age, "34");
});
