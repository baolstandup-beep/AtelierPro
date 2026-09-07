// AtelierPro PWA Service Worker
// Version: atelierpro-shell-v2

const CACHE_NAME = 'atelierpro-shell-v2';

// Check if running on localhost / dev environment
const isLocalhost =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname.endsWith('.local');

// Public shell assets to pre-cache on install (production only)
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
  /^\/auth\//,
  /supabase\.co/,
  /stripe\.com/,
  /wa\.me/,
  /api\.whatsapp\.com/,
];

self.addEventListener('install', (event) => {
  if (isLocalhost) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache info:', err);
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
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // If in localhost / development, let all requests pass straight to network
  if (isLocalhost) {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore cross-origin external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Never cache API routes or auth endpoints
  if (NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    return;
  }

  // 4. Navigation requests (HTML pages): Network-First, offline ONLY if truly offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedOffline = await cache.match('/offline');
        return (
          cachedOffline ||
          new Response(
            '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>AtelierPro — Hors ligne</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;background:#F7F4ED;color:#0F3B32;"><h1>Connexion indisponible</h1><p>Veuillez vérifier votre connexion Internet.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        );
      })
    );
    return;
  }

  // 5. Static assets: Cache-First with revalidation
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/offline';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
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
  }
});
