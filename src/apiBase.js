import { isNativeRuntime } from "./appRuntime.js";
import { SITE } from "./siteMeta.js";

const DEFAULT_API_BASE = String(SITE.url || "").replace(/\/$/, "");

function hostOf(runtime = globalThis) {
  try {
    return String(runtime.location?.hostname || "");
  } catch {
    return "";
  }
}

function protocolOf(runtime = globalThis) {
  try {
    return String(runtime.location?.protocol || "");
  } catch {
    return "";
  }
}

export function isLiveReloadHost(runtime = globalThis) {
  const host = hostOf(runtime);
  const protocol = protocolOf(runtime);
  if (protocol !== "http:" && protocol !== "https:") return false;
  if (host === "10.0.2.2" || host === "10.0.3.2") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  try {
    const port = String(runtime.location?.port || "");
    if ((host === "localhost" || host === "127.0.0.1") && port && protocol === "http:") {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function readApiBase(metaEnv = import.meta.env, runtime = globalThis) {
  const fromEnv = String(metaEnv?.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (isLiveReloadHost(runtime)) return "";
  if (isNativeRuntime(runtime)) return DEFAULT_API_BASE;
  return "";
}

export function apiUrl(path, metaEnv = import.meta.env, runtime = globalThis) {
  const route = String(path || "");
  const base = readApiBase(metaEnv, runtime);
  if (!base) return route;
  if (route.startsWith("http://") || route.startsWith("https://")) return route;
  return `${base}${route.startsWith("/") ? route : `/${route}`}`;
}

export function apiFetch(path, options, metaEnv = import.meta.env, runtime = globalThis) {
  return fetch(apiUrl(path, metaEnv, runtime), options);
}
