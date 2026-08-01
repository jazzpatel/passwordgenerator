/**
 * SpinLock Service Worker — offline-first, stale-while-revalidate
 * Bump CACHE_VERSION when you deploy a new build to force a cache refresh.
 */
const CACHE_VERSION = 'v2';
const CACHE_NAME = `spinlock-${CACHE_VERSION}`;

// Assets guaranteed to be cached on SW install (the app shell)
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: pre-cache the app shell ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete every cache that isn't ours ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: offline-first with background refresh ──────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);

      // Always fire a background network request to keep cache fresh
      const networkPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // Return cached version immediately if available (offline-first)
      if (cached) return cached;

      // Nothing in cache — wait for network
      const networkResponse = await networkPromise;
      if (networkResponse) return networkResponse;

      // Fully offline, nothing cached — serve app shell for navigations
      if (event.request.mode === 'navigate') {
        const shell = await cache.match('/index.html');
        if (shell) return shell;
      }

      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })()
  );
});

// ── Message: allow main thread to trigger SW update ───────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
