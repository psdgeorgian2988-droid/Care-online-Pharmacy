export const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
];

export const RELATION_OPTIONS = [
  { value: "spouse", label: "Spouse" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "grandmother", label: "Grand Mother" },
  { value: "grandfather", label: "Grand Father" },
];

export function normalizeRelation(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const aliases = {
    wife: "spouse",
    husband: "spouse",
    grandma: "grandmother",
    grandfather: "grandfather",
    granny: "grandmother",
    grandpa: "grandfather",
    "grand-mother": "grandmother",
    "grand-father": "grandfather",
  };
  const mapped = aliases[key] || key;
  return RELATION_OPTIONS.some((option) => option.value === mapped) ? mapped : "";
}

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function daysInMonth(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!m || m < 1 || m > 12) return 31;
  if (!y) {
    return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }
  return new Date(y, m, 0).getDate();
}

export function splitIsoDate(value) {
  const date = parseIsoDate(value);
  if (!date) return { day: "", month: "", year: "" };
  return {
    day: String(date.getDate()),
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear()),
  };
}

export function joinIsoDate(day, month, year) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!d || !m || !y) return "";
  const iso = `${y}-${pad2(m)}-${pad2(d)}`;
  return parseIsoDate(iso) ? iso : "";
}

export function toIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDate(value) {
  const text = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isoDateToday(today = new Date()) {
  return toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
}

export function isoDateYearsAgo(years, today = new Date()) {
  return toIsoDate(
    new Date(today.getFullYear() - Number(years || 0), today.getMonth(), today.getDate())
  );
}

export function isoDateYearsAhead(years, today = new Date()) {
  return isoDateYearsAgo(-Number(years || 0), today);
}

export function isoDateDaysAhead(days, today = new Date()) {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() + Number(days || 0));
  return toIsoDate(date);
}

export function normalizeDob(value) {
  return parseIsoDate(value) ? String(value).trim() : "";
}

export function ageFromDob(dob, today = new Date()) {
  const birth = parseIsoDate(dob);
  if (!birth) return "";
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years -= 1;
  }
  if (years < 0 || years > 120) return "";
  return String(years);
}

export function emptyPerson() {
  return { gender: "", dob: "", age: "" };
}

export function emptyFamilyMember() {
  return {
    id: `fam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    relation: "",
    mobile: "",
    useAccountMobile: true,
    gender: "",
    dob: "",
    age: "",
  };
}

/** Mobile of the person who created the account. Later edits keep it unless replace is set after OTP. */
export function accountCreatorMobile(source = {}, previous = {}, options = {}) {
  if (options.replace) {
    const next = normalizeMobile(source.mobile);
    if (isValidMobile(next)) return next;
  }
  const kept = normalizeMobile(
    previous.creatorMobile || source.creatorMobile || previous.mobile
  );
  if (isValidMobile(kept)) return kept;
  return normalizeMobile(source.mobile);
}

export function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

/** Show the first two and last three digits only, e.g. 9876543210 → 98*****210 */
export function maskMobile(value) {
  const digits = normalizeMobile(value);
  if (!digits) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 2)}${"*".repeat(digits.length - 5)}${digits.slice(-3)}`;
}

/** Show the first two letters of the mailbox only, e.g. asha@medihome.in → as**@medihome.in */
export function maskEmail(value) {
  const email = normalizeEmail(value);
  const at = email.indexOf("@");
  if (at < 1) return email;
  const user = email.slice(0, at);
  const domain = email.slice(at + 1);
  const keep = user.slice(0, Math.min(2, user.length));
  return `${keep}${"*".repeat(Math.max(1, user.length - keep.length))}@${domain}`;
}

export function isValidMobile(value) {
  return /^[6-9]\d{9}$/.test(normalizeMobile(value));
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 120) return false;
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email);
}

export function pickEmail(source = {}) {
  return normalizeEmail(source.email || source.mailId || source.mail);
}

export function validateEmail(source = {}, key = "email") {
  if (isValidEmail(source.email || source[key])) return {};
  return { [key]: "Enter a valid mail ID." };
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
  const dob = normalizeDob(source.dob || source.dateOfBirth);
  return {
    gender: normalizeGender(source.gender || source.sex),
    dob,
    age: dob ? ageFromDob(dob) : normalizeAge(source.age),
  };
}

export function genderLabel(value) {
  const key = normalizeGender(value);
  const hit = GENDER_OPTIONS.find((option) => option.value === key);
  return hit ? hit.label : "";
}

export function relationLabel(value) {
  const key = normalizeRelation(value);
  const hit = RELATION_OPTIONS.find((option) => option.value === key);
  return hit ? hit.label : "";
}

export function validatePerson(source = {}) {
  const person = pickPerson(source);
  const errors = {};
  if (!person.gender) errors.gender = "Select Male or Female.";
  if (!person.dob) {
    errors.dob = "Select date of birth.";
    return errors;
  }
  const age = Number(person.age);
  if (person.age === "" || !Number.isInteger(age) || age < 0 || age > 120) {
    errors.dob = "Select a valid date of birth.";
  }
  return errors;
}

export function pickFamilyMember(source = {}, index = 0, accountMobile = "") {
  const account = normalizeMobile(accountMobile);
  const own = normalizeMobile(source.mobile);
  const useAccount = Boolean(source.useAccountMobile) || !own;
  return {
    id: String(source.id || `fam-${index}`),
    name: String(source.name || "").trim(),
    relation: normalizeRelation(source.relation),
    mobile: useAccount ? account : own,
    useAccountMobile: useAccount,
    ...pickPerson(source),
  };
}

export function pickFamilyMembers(source = {}) {
  const list = Array.isArray(source.familyMembers) ? source.familyMembers : [];
  const account = accountCreatorMobile(source);
  return list.map((row, index) => pickFamilyMember(row, index, account));
}

export function validateFamilyMembers(source = {}) {
  const members = pickFamilyMembers(source);
  const account = accountCreatorMobile(source);
  const errors = {};
  members.forEach((member, index) => {
    if (!member.name) {
      errors[`familyMembers.${index}.name`] = "Family member name is required.";
    }
    if (!normalizeRelation(member.relation)) {
      errors[`familyMembers.${index}.relation`] = "Select a relation.";
    }
    if (member.useAccountMobile) {
      if (!isValidMobile(account)) {
        errors[`familyMembers.${index}.mobile`] =
          "Enter the account mobile, or type this member's own number.";
      }
    } else if (!isValidMobile(member.mobile)) {
      errors[`familyMembers.${index}.mobile`] =
        "Enter a 10-digit mobile, or use the account holder's number.";
    }
    const personErrors = validatePerson(member);
    if (personErrors.gender) {
      errors[`familyMembers.${index}.gender`] = personErrors.gender;
    }
    if (personErrors.dob) {
      errors[`familyMembers.${index}.dob`] = personErrors.dob;
    }
  });
  return errors;
}

export function memberSummary(member, accountMobile = "") {
  const row = pickFamilyMember(member, 0, accountMobile);
  const bits = [
    row.name || "Family member",
    relationLabel(row.relation),
    genderLabel(row.gender) || row.gender,
    row.age ? `${row.age} yrs` : "",
    row.mobile
      ? row.useAccountMobile
        ? `Mobile ${maskMobile(row.mobile)} (account)`
        : `Mobile ${maskMobile(row.mobile)}`
      : "",
  ].filter(Boolean);
  return bits.join(" · ");
}
