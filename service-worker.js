const CACHE_NAME = "hn-football-score-v24-20260825-knowledge-card-final";
const STATIC_ASSETS = [
  "/assets/css/app.css?v=20260824-mobile-size-fix",
  "/assets/css/analysis-news-v18.css?v=20260825-final-4x2-v7",
  "/assets/css/mobile-layout-patch.css?v=20260825-final-v7",
  "/assets/css/article-v18.css?v=20260825-final-v4",
  "/assets/css/admin.css?v=20260806-v10",
  "/assets/js/config.js?v=20260806-v10",
  "/assets/js/app.js?v=20260809-v15",
  "/assets/js/analysis-news-v18.js?v=20260825-final-v21",
  "/assets/js/admin.js?v=20260806-v10",
  "/manifest.webmanifest",
  "/assets/icons/icon.svg",
  "/assets/hn-footballclub.webp",
  "/assets/stadium-premium.webp",
  "/assets/og-image.jpg"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.allSettled(STATIC_ASSETS.map(asset => cache.add(asset)))));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.hostname.includes("workers.dev") || url.hostname.includes("888scoreonline.net")) return;
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(fetch(request, {cache:"no-store"}).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(fetch(request).then(response => {
    if (response && response.status === 200 && response.type === "basic") {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request)));
});
