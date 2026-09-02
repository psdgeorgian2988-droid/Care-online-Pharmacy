import { isNativeRuntime } from "./appRuntime.js";
import { SITE } from "./siteMeta.js";

const DEFAULT_API_BASE = String(SITE.url || "").replace(/\/$/, "");

export function readApiBase(metaEnv = import.meta.env, runtime = globalThis) {
  const fromEnv = String(metaEnv?.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
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
