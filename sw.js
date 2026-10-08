// OZON Grind Tracker — service worker
// Стратегия:
//   - index.html / config.js : network-first (чтобы обновления прилетали сразу),
//     с откатом в кэш когда сети нет.
//   - иконки/манифест/CDN     : cache-first (не меняются).
//   - Supabase REST/realtime  : НИКОГДА не кэшируем (данные должны быть живыми).

const VERSION = 'v4.0.0';
const CACHE = 'ozon-tracker-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll падает целиком если хоть один файл недоступен — кладём по одному
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

function isSupabase(url) {
  return url.hostname.endsWith('.supabase.co') || url.pathname.includes('/rest/v1/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Данные Supabase — всегда из сети, мимо кэша.
  if (isSupabase(url)) return;

  const isDoc = req.mode === 'navigate' ||
                url.pathname.endsWith('/') ||
                url.pathname.endsWith('index.html') ||
                url.pathname.endsWith('config.js');

  if (isDoc) {
    // network-first
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // cache-first для статики и CDN
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
