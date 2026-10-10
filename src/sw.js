// Life Tracker — service worker
// Стратегия (v7.1):
//   - index.html / config.js : stale-while-revalidate с проверкой ВЕРСИИ.
//       Кэш отдаётся мгновенно (0 ожиданий сети). Параллельно качается свежая
//       копия; если её <meta name="app-version"> отличается — кладём в кэш и
//       шлём странице INDEX_UPDATED {version}. Страница сама решает: тихо
//       перезапуститься (первые секунды, пользователь ничего не трогал) или
//       показать баннер «Обновить».
//   - иконки/манифест/CDN     : cache-first (не меняются).
//   - Supabase REST/realtime  : НИКОГДА не кэшируем (данные должны быть живыми).
//
// ВАЖНО: в install НЕТ skipWaiting(). Новый воркер активируется только по
// команде SKIP_WAITING со страницы — иначе открытая страница могла бы
// переключиться на другой кэш на полпути.
//
// VERSION подставляется сборщиком (build.py) из src/app.html — одна версия
// у страницы, воркера и имени кэша.

const VERSION = '__APP_VERSION__';
const CACHE = 'life-tracker-' + VERSION;
const INDEX_KEY = './index.html';

const PRECACHE = [
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
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((cl) => cl.postMessage({ type: 'SW_ACTIVATED', version: VERSION })))
  );
});

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (msg === 'GET_VERSION') {
    const reply = { type: 'VERSION', version: VERSION };
    if (e.ports && e.ports[0]) e.ports[0].postMessage(reply);
    else if (e.source) e.source.postMessage(reply);
  }
});

function isSupabase(url) {
  return url.hostname.endsWith('.supabase.co') || url.pathname.includes('/rest/v1/');
}

// Версия сборки из HTML — по <meta name="app-version">; у config.js версии нет.
const VER_RE = /<meta\s+name="app-version"\s+content="([^"]+)"/;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Данные Supabase — всегда из сети, мимо кэша.
  if (isSupabase(url)) return;

  // Сам воркер никогда не кэшируем — иначе обновления не находятся.
  if (url.pathname.endsWith('sw.js')) return;

  const isNav = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  const isCfg = url.pathname.endsWith('config.js');

  if (isNav || isCfg) {
    // Ключ кэша нормализуем: '/', '/index.html', '/?v=2' — это всё одна запись.
    const key = isNav ? INDEX_KEY : './config.js';
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(key);
        // Клонируем ДО отдачи странице: после return тело cached уже прочитано,
        // и cached.clone() в фоне бросит «body already used».
        const cmp = cached ? cached.clone() : null;
        const refresh = fetch(new Request(req.url, { cache: 'reload', credentials: 'same-origin' }))
          .then(async (res) => {
            if (!res || !res.ok) return res;
            const copy = res.clone();
            // Кэш обновляем при ЛЮБОМ изменении байтов (чтобы отладочные сборки
            // с той же версией не застревали), а страницу дёргаем только при
            // смене версии — иначе любой пересобранный байт вызывал бы перезапуск.
            let changed = true, verChanged = true, newVer = '';
            if (cmp) {
              const [t1, t2] = await Promise.all([cmp.text(), res.clone().text()]);
              changed = t1 !== t2;
              if (isNav) {
                const m1 = VER_RE.exec(t1), m2 = VER_RE.exec(t2);
                newVer = m2 ? m2[1] : '';
                verChanged = !(m1 && m2) || m1[1] !== m2[1];
              }
            }
            if (changed) {
              await c.put(key, copy);
              if (cmp && verChanged) {
                const clients = await self.clients.matchAll({ type: 'window' });
                clients.forEach((cl) => cl.postMessage({ type: 'INDEX_UPDATED', version: newVer || null, file: key }));
              }
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
