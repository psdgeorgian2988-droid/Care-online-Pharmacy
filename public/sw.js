self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "dose-alarms") return;
  const items = Array.isArray(data.items) ? data.items : [];
  event.waitUntil(applyDoseAlarms(items));
});

async function applyDoseAlarms(items) {
  const current = await self.registration.getNotifications();
  current.forEach((note) => {
    if (String(note.tag || "").startsWith("dose-")) note.close();
  });
  if (typeof TimestampTrigger !== "function") return;
  for (const item of items) {
    const at = Number(item.at);
    if (!at || at <= Date.now()) continue;
    try {
      await self.registration.showNotification(String(item.title || "Medicine"), {
        body: String(item.body || ""),
        tag: `dose-${item.stamp || at}`,
        showTrigger: new TimestampTrigger(at),
      });
    } catch {
      /* this browser cannot schedule a notification after the page closes */
    }
  }
}
