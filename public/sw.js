// ══════════════════════════════════════════════════════════════
// LIFTORY Service Worker — Push Notifications
// Handles push events and notification clicks.
// Does NOT cache anything (caching handled separately if needed).
// ══════════════════════════════════════════════════════════════

self.addEventListener("install", (event) => {
  // Activate immediately — don't wait for existing clients to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim all open clients so the SW is active immediately
  event.waitUntil(self.clients.claim());
});

// ── Push event: show native notification ──
self.addEventListener("push", (event) => {
  let data = { title: "LIFTORY", body: "Tienes una nueva notificacion.", url: "/home" };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        url: payload.url || data.url,
        icon: payload.icon || "/icon-192.png",
        badge: payload.badge || "/icon-192.png",
        tag: payload.tag || "liftory-notification",
      };
    }
  } catch {
    // If JSON parsing fails, try plain text
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || "liftory-notification",
    renotify: true,
    data: { url: data.url },
    // Vibrate pattern for mobile
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click: open or focus the app ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // If the app is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
