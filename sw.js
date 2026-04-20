// Recipe App Service Worker — オフライン対応版
// 戦略: app shell precache + cache-first navigation + cache-first assets
const CACHE_NAME = 'recipe-app-v8';
const SCOPE_PATH = '/recipe-app/';
const APP_SHELL_URL = SCOPE_PATH; // index.html as app shell
const PRECACHE_URLS = [
  SCOPE_PATH,
  SCOPE_PATH + 'index.html',
  SCOPE_PATH + 'manifest.json',
  SCOPE_PATH + 'icon-192.svg',
  SCOPE_PATH + 'icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1個ずつ try — 1つ失敗しても他は入れる
      await Promise.all(
        PRECACHE_URLS.map(url =>
          fetch(url, { cache: 'reload' })
            .then(res => res.ok ? cache.put(url, res) : null)
            .catch(() => null)
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;

  // Navigation: cache-first (オフラインでも起動)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(APP_SHELL_URL) || await cache.match(SCOPE_PATH + 'index.html');
        // バックグラウンドで更新を試みる
        const updatePromise = fetch(req)
          .then(res => {
            if (res && res.ok) cache.put(APP_SHELL_URL, res.clone());
            return res;
          })
          .catch(() => null);
        // キャッシュがあればすぐ返し、なければネット待ち
        if (cached) {
          updatePromise; // fire-and-forget
          return cached;
        }
        const fresh = await updatePromise;
        if (fresh) return fresh;
        // 最終手段: 簡易オフラインメッセージ
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>オフライン</title>' +
          '<div style="font-family:system-ui;padding:40px;text-align:center">' +
          '<h2>🍰 レシピ帳</h2><p>初回はネット接続が必要です。</p></div>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // 同一オリジンの static asset: cache-first + 背景更新
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then(res => {
            if (res && res.status === 200 && (res.type === 'basic' || res.type === 'opaque')) {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // クロスオリジン (CDN等): network-first → fallback cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
