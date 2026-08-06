const CACHE = "balltoday-v20260806-1";

const STATIC_ASSETS = [
  "/assets/icons/icon.svg",
  "/assets/images/stadium-bg.jpg",
  "/manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // ไม่แคช API และ iframe ภายนอก
  if (
    request.method !== "GET" ||
    url.hostname.includes("workers.dev") ||
    url.hostname.includes("888scoreonline.net")
  ) {
    return;
  }

  // HTML ใช้ Network First
  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => response)
        .catch(() => caches.match("/"))
    );
    return;
  }

  // CSS / JS / รูปภาพ ใช้ Cache First
  event.respondWith(
    caches.match(request).then(cacheResponse => {
      if (cacheResponse) return cacheResponse;

      return fetch(request).then(networkResponse => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE).then(cache => {
            cache.put(request, clone);
          });
        }

        return networkResponse;
      });
    })
  );
});
