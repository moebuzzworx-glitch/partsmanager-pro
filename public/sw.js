// -----------------------------------------------------------------------------
// Service Worker for Offline Support (Precaching & Runtime Caching)
// -----------------------------------------------------------------------------

const CACHE_NAME = 'partsmanager-cache-v1';

// Assets that should be cached immediately (App Shell if possible)
// Note: We cannot hardcode _next/static filenames here as they change every build.
// Instead, we rely on the OfflineReady component to trigger fetches that we cache.
const PRECACHE_URLS = [
  '/',
  '/icon.svg',
  '/manifest.json'
];

// Install Event: open cache
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  // Force this SW to become the active service worker for the page immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Precache failed (non-fatal):', err);
      });
    })
  );
});

// Activate Event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

// Fetch Event: The Core Caching Logic
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORE: Non-GET requests (POST, etc. cannot be cached)
  if (event.request.method !== 'GET') return;

  // 2. IGNORE: API requests (Firebase, external APIs) - let them hit network
  // (Firestore handles its own offline persistence)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('googleapis') || url.hostname.includes('firebase')) {
    return;
  }

  // 3. STRATEGY: Stale-While-Revalidate for Static Assets (_next/static, images)
  // These change infrequently or are hashed. We serve fast from cache, then update.
  if (url.pathname.startsWith('/_next/static') || url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. STRATEGY: Network First, Fallback to Cache for Documents (HTML Pages)
  // We want the latest data if online, but if offline, show the cached page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Verify valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          // Cache the fresh copy
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Network failed, try cache
          console.log('[SW] Network failed, falling back to cache for:', event.request.url);
          return caches.match(event.request);
        })
    );
    return;
  }

  // 5. DEFAULT: Network First (for everything else)
  // Simple pass-through but opportunistic caching for later
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Optionally cache other things here if success
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
