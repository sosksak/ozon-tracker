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

const VERSION = 'v7.0.2';
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
    // v7.0.2: stale-while-revalidate. Раньше было network-first — приложение ждало
    // полной докачки index.html (137 KB gzip) при каждом запуске, и на слабой
    // мобильной сети сплэш висел секундами. Теперь: кэш отдаётся МГНОВЕННО,
    // свежая копия качается в фоне; если она отличается — кладём в кэш и
    // сообщаем странице (та покажет баннер «Доступна новая версия»).
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const isNav = req.mode === 'navigate';
        const cached = await c.match(req, { ignoreSearch: !isNav && url.pathname.endsWith('config.js') })
          || (isNav ? await c.match('./index.html') : null);
        // Клонируем ДО отдачи странице: после return cached его тело уже прочитано,
        // и cached.clone() в фоне бросит «body already used».
        const cmp = cached ? cached.clone() : null;
        const refresh = fetch(new Request(req.url, { cache: 'reload', credentials: 'same-origin' }))
          .then(async (res) => {
            if (!res || !res.ok) return res;
            const copy = res.clone();
            let changed = true;
            if (cmp) {
              const sig = (r) => r.headers.get('etag') || r.headers.get('last-modified') || '';
              const a = sig(cmp), b = sig(res);
              if (a && b) changed = a !== b;
              else {
                const [t1, t2] = await Promise.all([cmp.text(), res.clone().text()]);
                changed = t1 !== t2;
              }
            }
            await c.put(req, copy);
            if (changed && cmp) {
              const clients = await self.clients.matchAll({ type: 'window' });
              clients.forEach((cl) => cl.postMessage({ type: 'INDEX_UPDATED' }));
            }
            return res;
          })
          .catch(() => null);
        if (cached) { e.waitUntil(refresh); return cached; }
        return (await refresh) || Response.error();
      })
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
