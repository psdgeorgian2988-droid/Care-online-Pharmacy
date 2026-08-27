export const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
];

export const RELATION_OPTIONS = [
  { value: "family", label: "Family" },
  { value: "spouse", label: "Spouse" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "other", label: "Other" },
];

export function emptyPerson() {
  return { gender: "", age: "" };
}

export function emptyFamilyMember() {
  return {
    id: `fam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    relation: "family",
    gender: "",
    age: "",
  };
}

export function normalizeGender(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "M" || key === "MALE") return "M";
  if (key === "F" || key === "FEMALE") return "F";
  return "";
}

export function normalizeAge(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 3);
}

export function pickPerson(source = {}) {
  return {
    gender: normalizeGender(source.gender || source.sex),
    age: normalizeAge(source.age),
  };
}

export function genderLabel(value) {
  const key = normalizeGender(value);
  const hit = GENDER_OPTIONS.find((option) => option.value === key);
  return hit ? hit.label : "";
}

export function relationLabel(value) {
  const key = String(value || "").trim().toLowerCase();
  const hit = RELATION_OPTIONS.find((option) => option.value === key);
  return hit ? hit.label : "Family";
}

export function validatePerson(source = {}) {
  const person = pickPerson(source);
  const errors = {};
  if (!person.gender) errors.gender = "Select Male or Female.";
  const age = Number(person.age);
  if (!person.age || !Number.isInteger(age) || age < 1 || age > 120) {
    errors.age = "Enter age in years (1 to 120).";
  }
  return errors;
}

export function pickFamilyMember(source = {}, index = 0) {
  return {
    id: String(source.id || `fam-${index}`),
    name: String(source.name || "").trim(),
    relation: String(source.relation || "family").trim() || "family",
    ...pickPerson(source),
  };
}

export function pickFamilyMembers(source = {}) {
  const list = Array.isArray(source.familyMembers) ? source.familyMembers : [];
  return list.map((row, index) => pickFamilyMember(row, index));
}

export function validateFamilyMembers(source = {}) {
  const members = pickFamilyMembers(source);
  const errors = {};
  members.forEach((member, index) => {
    if (!member.name) {
      errors[`familyMembers.${index}.name`] = "Family member name is required.";
    }
    const personErrors = validatePerson(member);
    if (personErrors.gender) {
      errors[`familyMembers.${index}.gender`] = personErrors.gender;
    }
    if (personErrors.age) {
      errors[`familyMembers.${index}.age`] = personErrors.age;
    }
  });
  return errors;
}

export function memberSummary(member) {
  const row = pickFamilyMember(member);
  const bits = [
    row.name || "Family member",
    relationLabel(row.relation),
    genderLabel(row.gender) || row.gender,
    row.age ? `${row.age} yrs` : "",
  ].filter(Boolean);
  return bits.join(" · ");
}
