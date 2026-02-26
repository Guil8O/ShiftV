const CACHE_NAME = 'shiftv-v2.0.0';
const STATIC_CACHE = 'shiftv-static-v2.0.0';
const DYNAMIC_CACHE = 'shiftv-dynamic-v1';

// App Shell — critical resources for offline
const urlsToCache = [
  '/ShiftV/',
  '/ShiftV/index.html',
  '/ShiftV/style.css',
  '/ShiftV/manifest.json',
  '/ShiftV/script.js',
  '/ShiftV/src/constants.js',
  '/ShiftV/src/utils.js',
  '/ShiftV/src/translations.js',
  '/ShiftV/src/data-manager.js',
  '/ShiftV/android/android-launchericon-512-512.png',
  '/ShiftV/android/android-launchericon-192-192.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  const keepCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (!keepCaches.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Cache-first for Google Fonts (Material Symbols woff2)
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Cache-first for Firebase Storage (avatar + photo uploads)
  if (url.origin === 'https://firebasestorage.googleapis.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Skip other cross-origin calls (Firebase, OpenAI, etc.)
  if (url.origin !== location.origin) return;

  // Strategy: Stale-while-revalidate for JS/CSS (fast load + background update)
  if (url.pathname.match(/\.(js|css|mjs)(\?|$)/)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cached);

          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Strategy: Cache-first for images/fonts/icons
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)(\?|$)/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Strategy: Network-first for HTML (always get latest)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request) || caches.match('/ShiftV/index.html'))
    );
    return;
  }

  // Default: Cache-first fallback
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});

// --- Web Push Notification ---
self.addEventListener('push', function (event) {
  const defaultTitle = 'ShiftV';
  const msgs = {
    ko: { title: 'ShiftV', body: '오늘 기록을 남겨보세요!', actionRecord: '기록하기', actionDismiss: '닫기' },
    en: { title: 'ShiftV', body: 'Time to log your measurements!', actionRecord: 'Record', actionDismiss: 'Close' },
    ja: { title: 'ShiftV', body: '今日も記録をつけましょう！', actionRecord: '記録する', actionDismiss: '閉じる' }
  };
  const defaultBody = msgs.ko.body;
  let title = defaultTitle;
  let body = defaultBody;
  let data = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || defaultTitle;
      body = payload.body || defaultBody;
      data = payload.data || {};
    } catch (e) {
      body = event.data.text() || defaultBody;
    }
  }
  const lang = data.lang || 'ko';
  const msg = msgs[lang] || msgs.ko;

  const options = {
    body,
    icon: '/ShiftV/android/android-launchericon-192-192.png',
    badge: '/ShiftV/android/android-launchericon-96-96.png',
    vibrate: [100, 50, 100],
    data,
    actions: [
      { action: 'record', title: msg.actionRecord },
      { action: 'dismiss', title: msg.actionDismiss }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes('/ShiftV') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/ShiftV/');
      }
    })
  );
});

// --- Local Scheduled Notification (via periodic message check) ---
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    // Store reminder schedule in service worker scope
    self._reminderSchedule = event.data.schedule; // { interval: 'daily'|'weekly'|'biweekly'|'off' }
  }
  if (event.data && event.data.type === 'CHECK_REMINDER') {
    // Client asks SW to show a local notification if conditions met
    const { lastRecordDate, lang } = event.data;
    const msgs = {
      ko: { title: 'ShiftV', body: '오늘 기록을 남겨보세요!' },
      en: { title: 'ShiftV', body: "Time to log your measurements!" },
      ja: { title: 'ShiftV', body: '今日も記録をつけましょう！' }
    };
    const m = msgs[lang] || msgs.ko;
    self.registration.showNotification(m.title, {
      body: m.body,
      icon: '/ShiftV/android/android-launchericon-192-192.png',
      badge: '/ShiftV/android/android-launchericon-96-96.png',
      vibrate: [100, 50, 100]
    });
  }
});
