export function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Capacitor native apps load from https://localhost — a SW would freeze old UI.
  const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
  if (isNative) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .getRegistrations?.()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      if (typeof caches !== "undefined") {
        caches
          .keys?.()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
    });
    return;
  }

  const host = window.location.hostname;
  const secure =
    window.location.protocol === "https:" ||
    host === "localhost" ||
    host === "127.0.0.1";
  if (!secure) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
