/* Kopi Boy Partner — service worker. Handles Web Push only (no offline caching). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Kopi Boy Partner";
  const urgent = data.category === "orders" || data.category === "deliveries" || data.category === "pickups";

  // Always show something: browsers (iOS especially) revoke a push
  // subscription that receives pushes without displaying them. `tag` collapses
  // a repeat of the same notification instead of stacking it.
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      vibrate: [200, 100, 200],
      requireInteraction: urgent,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              // cross-context navigate can fail; the focused app is still fine
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
