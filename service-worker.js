const CACHE_NAME = 'shiftv-v1.1.0';
const urlsToCache = [
  '/ShiftV/',
  '/ShiftV/index.html',
  '/ShiftV/style.css',
  '/ShiftV/manifest.json',
  '/ShiftV/script.js',
  '/ShiftV/android/android-launchericon-512-512.png',
  '/ShiftV/android/android-launchericon-192-192.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});

