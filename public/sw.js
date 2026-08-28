/**
 * Service Worker (Przystań PWA)
 *
 * Cache-First with Network-Fallback strategy for full offline support.
 */

const CACHE_NAME = 'przystan-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/apple-touch-icon-180.png',
  '/fonts/inter-latin.woff2',
  '/fonts/inter-latin-ext.woff2',
];

// Install event - Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-caching error:', err);
      })
  );
});

// Activate event - Clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event
//
// Nawigacje obsługujemy wzorcem app shell: KAŻDA ścieżka dostaje tę samą,
// jedną kopię /index.html. Wcześniej odpowiedź była cache'owana pod adresem
// żądania, więc po dodaniu tras /czas, /skupienie itd. każda z nich trzymałaby
// własną, osobno starzejącą się kopię powłoki.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Pomiń inne originy i rozszerzenia przeglądarki
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // --- nawigacje: zawsze powłoka spod /index.html ---
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put('/index.html', networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        const cached = await cache.match('/index.html');
        if (cached) {
          // odśwież w tle, oddaj natychmiast
          return cached;
        }

        const fromNetwork = await networkFetch;
        if (fromNetwork) return fromNetwork;

        const fallback = await cache.match('/');
        if (fallback) return fallback;

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
        });
      })()
    );
    return;
  }

  // --- zasoby: cache-first, dociągane po pierwszym użyciu ---
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(
          () =>
            new Response('Offline resource unavailable', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
            })
        );
    })
  );
});
