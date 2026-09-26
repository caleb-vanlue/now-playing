// Bumping the version deletes older caches on activate (v1 cached every
// thumbnail it ever saw, growing without bound)
const CACHE = "now-playing-v2";

const PRECACHE = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function safeCache(cache, request, response) {
  if (response.ok && response.type !== "opaque") {
    cache.put(request, response);
  }
}

// Only immutable build output and the app's own static files are cached.
// Thumbnails, optimized images, API data and RSC payloads always go to the network.
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/images/") ||
    PRECACHE.includes(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation requests (page HTML), cached copy when offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => safeCache(cache, request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? Response.error()))
    );
    return;
  }

  if (!isStaticAsset(url)) return;

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(
      (cached) => cached ?? fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => safeCache(cache, request, clone));
        return res;
      })
    )
  );
});
