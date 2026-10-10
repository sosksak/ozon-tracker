// Life Tracker — service worker
// Стратегия (v7.2.0): «сначала проверить, потом отдать» — без перезагрузок.
//   - index.html / config.js : перед отдачей страницы воркер делает HEAD-запрос
//       (пара сотен байт) и сравнивает ETag с кэшем. Совпал — отдаём кэш.
//       Не совпал — скачиваем новую сборку в кэш и отдаём СРАЗУ ЕЁ.
//       Страница никогда не стартует старой и потому никогда не перезагружается:
//       ни серого кадра iOS, ни двойного сплэша.
//       Лимит ожидания сети — NET_WAIT_MS; не успели / офлайн → кэш, проверка
//       доезжает в фоне и страница получает INDEX_UPDATED (баннер «Обновить»).
//   - иконки/манифест/CDN     : cache-first (не меняются).
//   - Supabase REST/realtime  : НИКОГДА не кэшируем (данные должны быть живыми).
//
// ВАЖНО: в install НЕТ skipWaiting(). Новый воркер активируется только по
// команде SKIP_WAITING со страницы — иначе открытая страница могла бы
// переключиться на другой кэш на полпути.
//
// VERSION подставляется сборщиком (build.py) из src/app.html — одна версия
// у страницы, воркера и имени кэша.

const VERSION = 'v7.4.0';
const CACHE = 'life-tracker-' + VERSION;
const INDEX_KEY = './index.html';
const CFG_KEY = './config.js';
const NET_WAIT_MS = 1500;   // сколько ждём проверку версии перед отдачей страницы

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

function isSupabase(url) {
  return url.hostname.endsWith('.supabase.co') || url.pathname.includes('/rest/v1/');
}

// Версия сборки из HTML — по <meta name="app-version">; у config.js версии нет.
const VER_RE = /<meta\s+name="app-version"\s+content="([^"]+)"/;
const verOf = (text) => { const m = VER_RE.exec(text || ''); return m ? m[1] : null; };

function netUrl(key) {
  // './index.html' → корень scope (GitHub Pages отдаёт одно и то же для '/' и '/index.html')
  return new URL(key === INDEX_KEY ? './' : key, self.registration.scope).href;
}

// Одна проверка на ключ за раз: навигация и CHECK_INDEX со страницы делят результат.
const inflight = {};
function refreshKey(key) {
  if (inflight[key]) return inflight[key];
  inflight[key] = (async () => {
    const result = { changed: false, version: null, verChanged: false, error: false };
    try {
      const c = await caches.open(CACHE);
      const cached = await c.match(key);
      const url = netUrl(key);
      const opts = { cache: 'reload', credentials: 'same-origin' };

      // Быстрый путь: HEAD + ETag (или Last-Modified). Для 400 KB страницы это пара сотен байт.
      if (cached) {
        const tag = (r) => r.headers.get('etag') || r.headers.get('last-modified') || '';
        const oldTag = tag(cached);
        if (oldTag) {
          try {
            const h = await fetch(new Request(url, { method: 'HEAD', ...opts }));
            if (h && h.ok && tag(h) === oldTag) return result;
          } catch (e) { /* HEAD не прошёл — падаем на полный GET */ }
        }
      }

      const res = await fetch(new Request(url, opts));
      if (!res || !res.ok) { result.error = true; return result; }
      const text = await res.clone().text();
      const oldText = cached ? await cached.text() : null;
      if (oldText === text) return result;

      await c.put(key, res);
      result.changed = true;
      if (key === INDEX_KEY) {
        result.version = verOf(text);
        const oldVer = verOf(oldText);
        result.verChanged = !!result.version && (!oldVer || oldVer !== result.version);
      }
      return result;
    } catch (e) {
      result.error = true;
      return result;
    } finally {
      delete inflight[key];
    }
  })();
  return inflight[key];
}

self.addEventListener('message', (e) => {
  const msg = e.data;
  const reply = (data) => {
    if (e.ports && e.ports[0]) e.ports[0].postMessage(data);
    else if (e.source) e.source.postMessage(data);
  };
  if (msg === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (msg === 'GET_VERSION') { reply({ type: 'VERSION', version: VERSION }); return; }
  if (msg && msg.type === 'CHECK_INDEX') {
    // Страница ждёт под сплэшем — отвечаем в любом случае (в т.ч. при ошибке сети).
    e.waitUntil(
      Promise.all([refreshKey(INDEX_KEY), refreshKey(CFG_KEY)])
        .then(([idx, cfg]) => reply({
          type: 'INDEX_CHECKED',
          changed: idx.changed || cfg.changed,
          version: idx.version,
          verChanged: idx.verChanged,
          error: idx.error
        }))
        .catch(() => reply({ type: 'INDEX_CHECKED', changed: false, version: null, verChanged: false, error: true }))
    );
  }
});

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
    const key = isNav ? INDEX_KEY : CFG_KEY;
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(key);
        if (!cached) {
          const res = await fetch(new Request(req.url, { cache: 'reload', credentials: 'same-origin' })).catch(() => null);
          if (res && res.ok) c.put(key, res.clone()).catch(() => {});
          return res || Response.error();
        }
        // Проверяем свежесть ДО отдачи: успели — отдаём актуальную копию,
        // не успели — кэш, а проверка дорабатывает в фоне.
        const check = refreshKey(key);
        const timeout = new Promise((r) => setTimeout(() => r({ timedOut: true }), NET_WAIT_MS));
        const r = await Promise.race([check, timeout]);
        if (r && r.timedOut) {
          e.waitUntil(check.then(async (res) => {
            if (!(res.changed && res.verChanged)) return;
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach((cl) => cl.postMessage({ type: 'INDEX_UPDATED', version: res.version, file: key }));
          }));
          return cached;
        }
        return (r.changed ? await c.match(key) : null) || cached;
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
