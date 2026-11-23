'use strict';
/* HikWeb service worker: leidžia įdiegti programėlę ir atidaryti sąsają net kai ryšys trumpam dingsta.
 * Sąsaja visada imama iš serverio (tinklas pirmiausia) – po atnaujinimo iškart matoma nauja versija.
 * Vaizdo srautai, API ir prisijungimas niekada nesaugomi. */
const CACHE = 'hikweb-shell-v3';
const SHELL = ['/', '/index.html', '/style.css', '/app.js', '/i18n.js', '/theme.js', '/logo-mark.png', '/favicon.png', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/hls/')) return; // tik tinklas
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && SHELL.includes(url.pathname)) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html'))),
  );
});
