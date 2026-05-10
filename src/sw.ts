/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
//
// LIFTORY service worker (Sprint 3) — single SW that handles BOTH:
//   1. Web Push notifications (preserved from the legacy public/sw.js).
//   2. Offline asset precache + runtime caching (new in Sprint 3).
//
// Built with vite-plugin-pwa using `injectManifest` strategy so we own the
// SW source and Workbox just injects the precache list.
//
// Why one SW instead of two: a browser can only register one service worker
// per scope. Splitting them would either silently lose push handlers or fight
// over registration. Combining is the safe path.

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, setDefaultHandler } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

// ── 1. Precache the build output (JS/CSS/HTML/assets) ───────────────────────
// `__WB_MANIFEST` is replaced at build time by vite-plugin-pwa with the list
// of files to precache. Each file is fingerprinted with a content hash so
// stale entries get cleaned up across deploys automatically.
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ── 2. Runtime caching strategies ───────────────────────────────────────────

// Navigations (HTML) → NetworkFirst, fallback to cache. Always try the latest
// deploy first so users see updates without manual refresh; if the network is
// dead, serve the cached app shell so they can still open the app.
//
// 6 seconds (was 3) gives a flaky gym connection (3G/spotty 4G) enough time
// to deliver fresh HTML before we surrender to cache. Falling back too eagerly
// risks serving an old index.html whose chunk hashes mismatch the bundles
// we'd actually try to load — which manifests as a blank screen or login
// flakiness as scripts fail to resolve.
registerRoute(
  ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin,
  new NetworkFirst({
    cacheName: "liftory-html",
    networkTimeoutSeconds: 6,
    plugins: [
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// Google Fonts CSS — small, changes rarely, stale-while-revalidate keeps it fast.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({ cacheName: "liftory-google-fonts-stylesheets" })
);

// Google Fonts files (.woff2) — immutable URLs, cache-first forever.
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "liftory-google-fonts-files",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Supabase API — explicit NetworkOnly. NEVER cache user data here.
// Sprint 1+2 already manage offline state for these via the userland queue
// + workout cache; the SW must not get in the way.
registerRoute(
  ({ url }) => url.hostname.endsWith(".supabase.co"),
  new NetworkOnly()
);

// Anything else (third-party CDNs, analytics, etc.) — no caching, just network.
setDefaultHandler(new NetworkOnly());

// ── 3. Lifecycle: activate immediately, claim all clients ───────────────────
self.addEventListener("install", () => {
  // Don't wait for existing tabs to close; the new SW takes over right away.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── 4. Web Push notifications (preserved from legacy /sw.js) ────────────────
type PushData = {
  title: string;
  body: string;
  url: string;
  icon?: string;
  badge?: string;
  tag?: string;
};

self.addEventListener("push", (event) => {
  let data: PushData = {
    title: "LIFTORY",
    body: "Tienes una nueva notificacion.",
    url: "/home",
  };

  try {
    if (event.data) {
      const payload = event.data.json() as Partial<PushData>;
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
    if (event.data) data.body = event.data.text();
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || "liftory-notification",
    renotify: true,
    data: { url: data.url },
    // vibrate is supported on Android; ignored on iOS (which is fine).
    ...((typeof Notification !== "undefined" && "vibrate" in Notification.prototype) && {
      vibrate: [100, 50, 100],
    }),
  } as NotificationOptions;

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          (client as WindowClient).focus();
          (client as WindowClient).navigate(targetUrl);
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

export {};
