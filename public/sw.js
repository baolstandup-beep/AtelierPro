// AtelierPro PWA Service Worker
// Version: atelierpro-shell-v1

const CACHE_NAME = 'atelierpro-shell-v1';

// Public shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/apple-touch-icon.png',
];

// URLs that must NEVER be cached
const NEVER_CACHE_PATTERNS = [
  /^\/api\//,
  /^\/auth\/callback/,
  /supabase\.co/,
  /stripe\.com/,
  /wa\.me/,
  /api\.whatsapp\.com/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache failed during install:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting obsolete cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore cross-origin external requests (Supabase, Stripe, analytics, CDNs, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Never cache API routes, auth callbacks, or private endpoints
  if (NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    return;
  }

  // 4. Navigation requests (HTML pages): Network-First with Offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response received, return it directly without caching sensitive user screens
          return response;
        })
        .catch(async () => {
          console.log('[SW] Network unreachable for navigation, loading offline page');
          const cache = await caches.open(CACHE_NAME);
          const cachedOffline = await cache.match('/offline');
          return (
            cachedOffline ||
            new Response(
              '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>AtelierPro — Hors ligne</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;background:#F7F4ED;color:#0F3B32;"><h1>Connexion indisponible</h1><p>Veuillez vous reconnecter à Internet pour accéder à AtelierPro.</p></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
          );
        })
    );
    return;
  }

  // 5. Static immutable assets (_next/static, public icons, manifest, fonts): Cache-First / SWR
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/offline';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached asset immediately, revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: pass-through to network
  event.respondWith(fetch(request));
});
