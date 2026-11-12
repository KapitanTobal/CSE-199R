const CACHE_NAME = "budget-dashboard-v8";

const APP_FILES = [
    "./",
    "./index.html",
    "./subscriptions.html",
    "./paycheck-planner.html",
    "./auth.html",
    "./style.css",
    "./script.js",
    "./recurring.js",
    "./paycheck-planner.js",
    "./subscriptions.js",
    "./subscription-ui.js",
    "./auth.js",
    "./supabase-config.js",
    "./pwa.js",
    "./manifest.json",
  ];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (cacheName) {
            return cacheName !== CACHE_NAME;
          })
          .map(function (cacheName) {
            return caches.delete(cacheName);
          })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      return cachedResponse || fetch(event.request);
    })
  );
});
