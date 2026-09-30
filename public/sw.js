/**
 * Service Worker for Thue-2026 PWA
 * Cache strategies:
 * - Cache-first for static assets (CSS, JS, images, fonts)
 * - Network-first for dynamic content (HTML pages)
 */

// Tăng VERSION khi đổi file này (chiến lược cache, danh sách tiền cache) → activate xóa mọi cache cũ.
// ponytail: cache tĩnh giữ chunk của các lần deploy trước tới khi VERSION tăng; cần dọn theo build thì nhúng build id.
const VERSION = 'v2';
const STATIC_CACHE_NAME = `thue-2026-static-${VERSION}`;
const DYNAMIC_CACHE_NAME = `thue-2026-dynamic-${VERSION}`;

// Static assets to pre-cache (đường dẫn thật trong public/ và out/; trailingSlash: true → '/tinh-thue/')
const STATIC_ASSETS = [
  '/',
  '/tinh-thue/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

// File extensions that should use cache-first strategy
const CACHE_FIRST_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
];

// Install event - pre-cache static assets
// Không skipWaiting(): bản mới chờ tới khi người dùng bấm "Cập nhật ngay" (PWAUpdatePrompt gửi SKIP_WAITING)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((error) => {
        console.error('[SW] Pre-cache failed:', error);
      })
  );
});

// Activate event - clean up old caches (mọi cache 'thue-2026-*' không thuộc VERSION hiện tại)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('thue-2026-') &&
                     cacheName !== STATIC_CACHE_NAME &&
                     cacheName !== DYNAMIC_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Determine caching strategy based on request type
  const extension = getFileExtension(url.pathname);

  if (CACHE_FIRST_EXTENSIONS.includes(extension)) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/_next/')) {
    // Cache-first for Next.js static chunks
    event.respondWith(cacheFirst(request));
  } else {
    // Network-first for HTML pages and dynamic content
    event.respondWith(networkFirst(request));
  }
});

/**
 * Cache-first strategy
 * Try cache first, fallback to network, cache the network response
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network-first strategy
 * Try network first, fallback to cache, cache the network response
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Chỉ điều hướng trang mới nhận HTML dự phòng; request dữ liệu (RSC .txt, JSON...) trả lỗi mạng
    // để Next.js tự xử lý thay vì nhận nhầm HTML
    if (request.mode !== 'navigate') {
      return Response.error();
    }

    // Return offline page if available, otherwise return error
    const offlinePage = await caches.match('/');

    if (offlinePage) {
      return offlinePage;
    }

    return new Response(getOfflineHTML(), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

/**
 * Get file extension from pathname
 */
function getFileExtension(pathname) {
  const lastDot = pathname.lastIndexOf('.');
  if (lastDot === -1) return '';
  return pathname.substring(lastDot).toLowerCase();
}

/**
 * Offline HTML fallback
 */
function getOfflineHTML() {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Tính Thuế TNCN 2026</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      background: #FBFBF9;
      color: #223349;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      color: #3A4C68;
      max-width: 400px;
      line-height: 1.6;
    }
    button {
      margin-top: 24px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      color: white;
      background: #223349;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    button:hover {
      background: #182230;
    }
  </style>
</head>
<body>
  <h1>Không có kết nối mạng</h1>
  <p>Ứng dụng cần kết nối internet để hoạt động. Vui lòng kiểm tra kết nối mạng và thử lại.</p>
  <button onclick="window.location.reload()">Thử lại</button>
</body>
</html>
  `.trim();
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
