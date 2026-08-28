import { useEffect, useState } from "react";
import { readUserProfile } from "./addressFields";

export const PROFILE_KEY = "mediHomeUser";
export const LOGIN_SESSION_KEY = "mediHomeLoggedIn";
export const AUTH_EVENT = "medihome-auth";

export function readLoginSession() {
  try {
    if (sessionStorage.getItem(LOGIN_SESSION_KEY) !== "1") return null;
    const saved = readUserProfile();
    return saved.mobile ? saved : null;
  } catch {
    return null;
  }
}

export function writeLoginSession(user) {
  try {
    if (user?.mobile) sessionStorage.setItem(LOGIN_SESSION_KEY, "1");
    else sessionStorage.removeItem(LOGIN_SESSION_KEY);
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
    if (next.startsWith("#") && next !== "#login" && next !== "#register") {
      return next;
    }
  } catch {
    /* ignore */
  }
  return "#home";
}

export function logoutSession() {
  writeLoginSession(null);
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
