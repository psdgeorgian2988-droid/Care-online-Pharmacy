import test from "node:test";
import assert from "node:assert/strict";
import { pickPerson, validateFamilyMembers, validatePerson } from "./personFields.js";

test("gender and age are required on register", () => {
  const errors = validatePerson({});
  assert.equal(errors.gender.includes("Male"), true);
  assert.equal(errors.age.includes("age"), true);
});

test("male/female and a valid age pass", () => {
  assert.deepEqual(validatePerson({ gender: "M", age: "34" }), {});
  assert.deepEqual(validatePerson({ gender: "Female", age: "8" }), {});
});

test("age must be a whole number between 1 and 120", () => {
  assert.equal(Boolean(validatePerson({ gender: "F", age: "0" }).age), true);
  assert.equal(Boolean(validatePerson({ gender: "M", age: "121" }).age), true);
  assert.equal(Boolean(validatePerson({ gender: "M", age: "12.5" }).age), true);
});

test("family members can be added with male/female and age", () => {
  assert.deepEqual(validateFamilyMembers({ familyMembers: [] }), {});
  const errors = validateFamilyMembers({
    familyMembers: [{ name: "", relation: "son", gender: "", age: "" }],
  });
  assert.equal(Boolean(errors["familyMembers.0.name"]), true);
  assert.equal(Boolean(errors["familyMembers.0.gender"]), true);
  assert.equal(Boolean(errors["familyMembers.0.age"]), true);
  assert.deepEqual(
    validateFamilyMembers({
      familyMembers: [{ name: "Aarav", relation: "son", gender: "M", age: "8" }],
    }),
    {}
  );
});

test("pickPerson keeps M or F and digits-only age", () => {
  const row = pickPerson({ gender: "female", age: "34 years" });
  assert.equal(row.gender, "F");
  assert.equal(row.age, "34");
});
