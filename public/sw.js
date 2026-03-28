const CACHE_NAME = 'liftory-v2';

// Install: skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: delete ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for everything
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => response)
      .catch(() => caches.match(event.request))
  );
});
