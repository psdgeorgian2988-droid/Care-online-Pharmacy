export const APP_ROLE_KEY = "medihome.appRole";
export const APP_LAUNCH_KEY = "medihome.launchDone";

export const APP_ROLES = {
  customer: {
    id: "customer",
    title: "Customer App",
    hash: "#home",
    summary: "Medicines, Lab Tests, Home Care, And Account.",
  },
  staff: {
    id: "staff",
    title: "Staff App",
    hash: "#admin",
    summary: "Orders, Partners, And Operations Desk.",
  },
  partner: {
    id: "partner",
    title: "Partner App",
    hash: "#partner",
    summary: "Assigned Jobs For Delivery, Lab, And Visits.",
  },
};

export function isNativeRuntime(env = globalThis) {
  try {
    return Boolean(env.Capacitor?.isNativePlatform?.() || env.Capacitor?.isNative);
  } catch {
    return false;
  }
}

export function isStandaloneDisplay(env = globalThis) {
  try {
    const mode = env.matchMedia?.("(display-mode: standalone)")?.matches;
    const iosStandalone = Boolean(env.navigator?.standalone);
    return Boolean(mode || iosStandalone);
  } catch {
    return false;
  }
}

export function isInstalledApp(env = globalThis) {
  return isNativeRuntime(env) || isStandaloneDisplay(env);
}

export function readAppRole(store) {
  try {
    const storage = store || globalThis.localStorage;
    const value = String(storage?.getItem?.(APP_ROLE_KEY) || "").trim();
    return APP_ROLES[value] ? value : "";
  } catch {
    return "";
  }
}

export function writeAppRole(role, store) {
  const id = APP_ROLES[role] ? role : "";
  try {
    const storage = store || globalThis.localStorage;
    if (!id) storage?.removeItem?.(APP_ROLE_KEY);
    else storage?.setItem?.(APP_ROLE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
  return id;
}

export function shouldShowAppPicker(route, env = globalThis, store) {
  if (route === "#apps") return true;
  if (!isInstalledApp(env)) return false;
  if (readAppRole(store)) return false;
  return route === "#home";
}

export function launchHashForRole(role, route, sessionStore) {
  const chosen = APP_ROLES[role];
  if (!chosen) return "";
  try {
    const storage = sessionStore || globalThis.sessionStorage;
    if (storage?.getItem?.(APP_LAUNCH_KEY)) return "";
    storage?.setItem?.(APP_LAUNCH_KEY, "1");
  } catch {
    /* continue with a one-shot redirect */
  }
  if (route === "#home" && chosen.hash !== "#home") return chosen.hash;
  return "";
}
