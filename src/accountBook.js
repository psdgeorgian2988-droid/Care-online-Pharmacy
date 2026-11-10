import { findAccountActor } from "./familyAccount.js";
import { profileLoginPin } from "./loginPin.js";
import { accountCreatorMobile, isValidMobile, normalizeMobile } from "./personFields.js";

const BOOK_KEY = "mediHomeAccountBook";

function readBook() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem?.(BOOK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row === "object") : [];
  } catch {
    return [];
  }
}

function writeBook(rows) {
  try {
    globalThis.localStorage?.setItem?.(BOOK_KEY, JSON.stringify(rows));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Keep a registered account after logout. Guest checkout does not replace this copy. */
export function rememberAccount(profile) {
  if (!profile || typeof profile !== "object") return;
  if (profile.isGuest && !profileLoginPin(profile)) return;
  const mobile = accountCreatorMobile(profile);
  if (!isValidMobile(mobile)) return;
  const { photo, ...rest } = profile;
  const next = {
    ...rest,
    mobile,
    creatorMobile: mobile,
    loginPin: profileLoginPin(profile),
    isGuest: false,
  };
  const rows = readBook().filter((row) => accountCreatorMobile(row) !== mobile);
  rows.push(next);
  writeBook(rows);
}

/** Household profile for this mobile, including a family member's own number. */
export function findRememberedAccount(mobile) {
  const wanted = normalizeMobile(mobile);
  if (!isValidMobile(wanted)) return null;
  for (const profile of readBook()) {
    const actor = findAccountActor({ ...profile, isGuest: false }, wanted);
    if (!actor) continue;
    return {
      profile: { ...profile, isGuest: false },
      actor,
    };
  }
  return null;
}
