import { useEffect, useState } from "react";
import { readUserProfile } from "./addressFields.js";
import {
  holderActor,
  isHolderActor,
  profileForActor,
} from "./familyAccount.js";

import { normalizeLoginPin } from "./loginPin.js";

export const PROFILE_KEY = "mediHomeUser";
export const LOGIN_SESSION_KEY = "mediHomeLoggedIn";
export const ACTOR_SESSION_KEY = "mediHomeActor";
export const ENTRY_CHOSEN_KEY = "mediHomeEntryChosen";
export const AUTH_EVENT = "medihome-auth";

function localStore() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function sessionStore() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function readPersistedItem(key) {
  try {
    const local = localStore()?.getItem?.(key);
    if (local != null && local !== "") return local;
  } catch {
    /* ignore */
  }
  try {
    return sessionStore()?.getItem?.(key);
  } catch {
    return null;
  }
}

function writePersistedItem(key, value) {
  try {
    localStore()?.setItem?.(key, value);
  } catch {
    /* ignore quota / private mode */
  }
  try {
    sessionStore()?.setItem?.(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function removePersistedItem(key) {
  try {
    localStore()?.removeItem?.(key);
  } catch {
    /* ignore */
  }
  try {
    sessionStore()?.removeItem?.(key);
  } catch {
    /* ignore */
  }
}

export function customerGreeting(user) {
  const first = String(user?.name || "").trim().split(/\s+/)[0];
  return first ? `Hello, ${first}` : "";
}

export function markCustomerEntryChosen(store = sessionStore()) {
  try {
    store?.setItem?.(ENTRY_CHOSEN_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearCustomerEntryChosen(store = sessionStore()) {
  try {
    store?.removeItem?.(ENTRY_CHOSEN_KEY);
  } catch {
    /* ignore */
  }
}

export function needsCustomerWelcome(user, store = sessionStore()) {
  if (user) return false;
  try {
    return store?.getItem?.(ENTRY_CHOSEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export function readAccountActor() {
  try {
    const parsed = JSON.parse(readPersistedItem(ACTOR_SESSION_KEY) || "null");
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ignore */
  }
  return { role: "holder", memberId: "" };
}

export function readHouseholdProfile() {
  return readUserProfile();
}

export function authEntryHref() {
  try {
    const saved = readUserProfile();
    if (saved?.isGuest) return "#register";
    const mobile = String(saved?.creatorMobile || saved?.mobile || "").replace(
      /\D/g,
      ""
    );
    const pin = normalizeLoginPin(saved?.loginPin);
    if (/^[6-9]\d{9}$/.test(mobile) && pin) return "#login";
  } catch {
    /* ignore */
  }
  return "#register";
}

export function hasAccountSession(user = readLoginSession()) {
  return Boolean(user?.mobile && !user.isGuest);
}

export function rememberReturnHash(hash) {
  try {
    const next = String(hash || "").trim();
    if (next.startsWith("#") && next !== "#login" && next !== "#register") {
      sessionStorage.setItem("mediHomeReturnHash", next);
    }
  } catch {
    /* ignore */
  }
}

export function readLoginSession() {
  try {
    if (readPersistedItem(LOGIN_SESSION_KEY) !== "1") return null;
    const saved = readUserProfile();
    if (!saved.mobile) return null;
    return profileForActor(saved, readAccountActor());
  } catch {
    return null;
  }
}

export function writeLoginSession(user, actor) {
  try {
    if (user?.mobile) {
      writePersistedItem(LOGIN_SESSION_KEY, "1");
      writePersistedItem(
        ACTOR_SESSION_KEY,
        JSON.stringify(actor || holderActor(user))
      );
      markCustomerEntryChosen();
    } else {
      removePersistedItem(LOGIN_SESSION_KEY);
      removePersistedItem(ACTOR_SESSION_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
    window.dispatchEvent(new Event("mediHomeSession"));
  }
}

export function consumeReturnHash() {
  try {
    const next = sessionStorage.getItem("mediHomeReturnHash") || "";
    sessionStorage.removeItem("mediHomeReturnHash");
    if (
      next.startsWith("#") &&
      next !== "#login" &&
      next !== "#register" &&
      next !== "#forgot"
    ) {
      return next;
    }
  } catch {
    /* ignore */
  }
  return "#home";
}

export function logoutSession() {
  writeLoginSession(null);
  clearCustomerEntryChosen();
}

export function useLoginSession() {
  const [user, setUser] = useState(readLoginSession);

  useEffect(() => {
    const refresh = () => setUser(readLoginSession());
    window.addEventListener("storage", refresh);
    window.addEventListener(AUTH_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(AUTH_EVENT, refresh);
    };
  }, []);

  return user;
}

export function useAccountActor() {
  const user = useLoginSession();
  if (!user) return null;
  if (!isHolderActor(readAccountActor()) || user.accountRole === "member") {
    return { role: "member", memberId: user.accountMemberId || "" };
  }
  return { role: "holder", memberId: "" };
}
