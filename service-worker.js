const CACHE_NAME = 'shiftv-cache-v1';
const urlsToCache = [
  '',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/android/android-launchericon-512-512.png',
  '/android/android-launchericon-192-192.png',
];

// 설치 이벤트: 캐시 파일 저장
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

// fetch 이벤트: 캐시 or 네트워크 응답
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});

// 활성화 이벤트: 오래된 캐시 제거
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
    })
  );
});
