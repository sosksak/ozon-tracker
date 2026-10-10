// Life Tracker — service worker
// Стратегия:
//   - index.html / config.js : network-first, в обход HTTP-кэша браузера
//     (иначе GitHub Pages отдаёт старый файл и обновление «не прилетает»),
//     с откатом в кэш когда сети нет.
//   - иконки/манифест/CDN     : cache-first (не меняются).
//   - Supabase REST/realtime  : НИКОГДА не кэшируем (данные должны быть живыми).
//
// ВАЖНО: в install НЕТ skipWaiting(). Иначе новый воркер активируется мгновенно,
// баннер «Доступна новая версия» мелькает и исчезает, а страница перезагружается
// раньше, чем пользователь успел нажать кнопку. Активируемся только по команде
// SKIP_WAITING из страницы.

const VERSION = 'v7.0.0';
const CACHE = 'life-tracker-' + VERSION;

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
      // addAll падает целиком если хоть один файл недоступен — кладём по одному,
      // и всегда из сети, чтобы в новый кэш не переехала старая копия.
      .then((c) => Promise.all(PRECACHE.map((u) =>
        fetch(new Request(u, { cache: 'reload' }))
          .then((res) => (res && res.ok) ? c.put(u, res) : null)
          .catch(() => null)
      )))
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
  const msg = e.data;
  if (msg === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (msg === 'GET_VERSION' && e.source) { e.source.postMessage({ type: 'VERSION', version: VERSION }); }
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

  // Сам воркер никогда не кэшируем — иначе обновления не находятся.
  if (url.pathname.endsWith('sw.js')) return;

  const isDoc = req.mode === 'navigate' ||
                url.pathname.endsWith('/') ||
                url.pathname.endsWith('index.html') ||
                url.pathname.endsWith('config.js');

  if (isDoc) {
    // network-first, принудительно мимо HTTP-кэша
    e.respondWith(
      fetch(new Request(req.url, { cache: 'reload', credentials: 'same-origin' }))
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
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
