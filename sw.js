// 서비스 워커에서 사용할 캐시의 이름과 버전을 정의합니다.
// 앱의 핵심 파일(HTML, CSS, JS 등)이 변경될 때마다 버전을 업데이트해야 합니다.
const STATIC_CACHE_NAME = 'static-site-cache-v1';
// 오프라인 시 보여줄 대체 페이지 (선택 사항)
const OFFLINE_URL = '/offline.html';

// 설치 시 캐싱할 앱의 핵심 파일 목록 (App Shell)
// '/'는 보통 index.html을 의미합니다. 실제 파일 경로에 맞게 수정하세요.
const CACHE_FILES = [
  '/', // 루트 경로 (index.html 등)
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/main.js',
  '/images/logo.png',
  // 필요한 다른 핵심 정적 파일들 추가...
  OFFLINE_URL // 오프라인 페이지도 캐싱
];

// 1. 서비스 워커 설치 (Install) 이벤트
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  // waitUntil: 이 작업이 완료될 때까지 설치 단계를 마치지 않도록 합니다.
  event.waitUntil(
    // 지정된 이름으로 캐시 저장소를 엽니다.
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching App Shell files');
        // CACHE_FILES 목록에 있는 모든 파일을 캐시에 추가합니다.
        // addAll은 원자적 연산: 하나라도 실패하면 전체가 실패합니다.
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // 즉시 활성화되도록 요청 (선택 사항, 새 워커가 페이지 제어를 빨리 가져가도록 함)
        // return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// 2. 서비스 워커 활성화 (Activate) 이벤트
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  // waitUntil: 이 작업이 완료될 때까지 활성화 단계를 마치지 않도록 합니다.
  event.waitUntil(
    // 현재 캐시 저장소의 모든 키(이름)를 가져옵니다.
    caches.keys().then((cacheNames) => {
      // 현재 사용 중인 정적 캐시(STATIC_CACHE_NAME)를 제외한
      // 이전 버전의 캐시를 삭제하는 Promise 배열을 생성합니다.
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
        console.log('[Service Worker] Activation complete');
        // 즉시 페이지 제어를 시작하도록 클라이언트에게 알림 (선택 사항)
        // return self.clients.claim();
      })
  );
});

// 3. 네트워크 요청 가로채기 (Fetch) 이벤트
self.addEventListener('fetch', (event) => {
  // console.log('[Service Worker] Fetching:', event.request.url);

  // GET 요청만 처리합니다. 다른 메소드(POST 등)는 네트워크로 바로 전달합니다.
  if (event.request.method !== 'GET') {
    // console.log('[Service Worker] Non-GET request, skipping cache:', event.request.method, event.request.url);
    return; // 기본 브라우저 동작에 맡김
  }

  // Cache First 전략: 캐시에서 먼저 찾고, 없으면 네트워크로 요청합니다.
  event.respondWith(
    // 요청에 해당하는 응답이 캐시에 있는지 확인합니다.
    caches.match(event.request)
      .then((cachedResponse) => {
        // 1. 캐시에 응답이 있으면 캐시된 응답을 반환합니다. (오프라인 우선)
        if (cachedResponse) {
          // console.log('[Service Worker] Returning response from cache:', event.request.url);
          return cachedResponse;
        }

        // 2. 캐시에 응답이 없으면 네트워크로 요청을 보냅니다.
        // console.log('[Service Worker] No response found in cache. Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // 네트워크 응답이 유효한 경우 (예: 404 Not Found가 아닌 경우)
            if (networkResponse && networkResponse.status === 200) {
               // 중요: 응답을 사용하기 전에 복제해야 합니다.
               // 응답 스트림은 한 번만 사용할 수 있기 때문입니다.
               // 하나는 캐시에 저장하고, 다른 하나는 브라우저에 반환합니다.
              const responseToCache = networkResponse.clone();

              // 캐시를 열고 복제된 응답을 저장합니다. (다음 요청을 위해)
              caches.open(STATIC_CACHE_NAME)
                .then((cache) => {
                  // console.log('[Service Worker] Caching new resource:', event.request.url);
                  cache.put(event.request, responseToCache);
                });
            }
            // 원본 네트워크 응답을 브라우저에 반환합니다.
            return networkResponse;
          })
          .catch((error) => {
            // 3. 네트워크 요청도 실패한 경우 (오프라인 상태 등)
            console.error('[Service Worker] Fetch failed; returning offline page instead.', error);

            // 미리 캐싱된 오프라인 페이지를 반환합니다.
            // 만약 HTML 페이지 요청이었다면 오프라인 페이지를 보여주는 것이 좋습니다.
            // 다른 리소스(이미지, CSS 등) 요청 실패 시에는 다른 처리가 필요할 수 있습니다.
            if (event.request.mode === 'navigate') { // HTML 페이지 요청인 경우
              return caches.match(OFFLINE_URL);
            }
            // 다른 종류의 리소스 요청 실패 시에는 빈 응답이나 에러 응답 반환 가능
            // return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); // 예: JSON 요청 실패 시
            // return new Response('', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});