import { useEffect, useState } from "react";
import { readUserProfile } from "./addressFields";
import {
  holderActor,
  isHolderActor,
  profileForActor,
} from "./familyAccount";

import { normalizeLoginPin } from "./loginPin";

export const PROFILE_KEY = "mediHomeUser";
export const LOGIN_SESSION_KEY = "mediHomeLoggedIn";
export const ACTOR_SESSION_KEY = "mediHomeActor";
export const AUTH_EVENT = "medihome-auth";

export function readAccountActor() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ACTOR_SESSION_KEY) || "null");
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

export function readLoginSession() {
  try {
    if (sessionStorage.getItem(LOGIN_SESSION_KEY) !== "1") return null;
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
      sessionStorage.setItem(LOGIN_SESSION_KEY, "1");
      sessionStorage.setItem(
        ACTOR_SESSION_KEY,
        JSON.stringify(actor || holderActor(user))
      );
    } else {
      sessionStorage.removeItem(LOGIN_SESSION_KEY);
      sessionStorage.removeItem(ACTOR_SESSION_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
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
  try {
    sessionStorage.removeItem("mediHomeEntryChosen");
  } catch {
    /* ignore */
  }
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
