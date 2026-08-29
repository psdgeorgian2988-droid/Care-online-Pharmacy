export function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
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
