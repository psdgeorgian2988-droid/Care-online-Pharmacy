const DEVICE_KEY = "mediHomeDeviceId";

export function readDeviceId(storage = globalThis.localStorage) {
  try {
    const current = String(storage?.getItem?.(DEVICE_KEY) || "");
    if (/^[a-zA-Z0-9_-]{20,80}$/.test(current)) return current;
    const bytes = new Uint8Array(18);
    globalThis.crypto?.getRandomValues?.(bytes);
    const id = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
    if (!/^[a-f0-9]{36}$/.test(id)) return "";
    storage?.setItem?.(DEVICE_KEY, id);
    return id;
  } catch {
    return "";
  }
}
