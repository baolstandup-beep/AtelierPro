// Service worker Élégance by Aicha.
// Règle : seules les ressources statiques publiques sont mises en cache
// (scripts/styles versionnés de Next, icônes, polices). Les pages de
// l'application et toutes les données (Supabase) passent TOUJOURS par le
// réseau : aucune donnée commerciale ou personnelle n'est stockée en cache.
const VERSION = "eba-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|png|svg|ico)$/.test(url.pathname))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navigation : réseau uniquement, page hors ligne si le réseau échoue.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
