'use strict';
const CACHE_PREFIX = 'fish-head:' + new URL('./', self.location.href).pathname + ':';
const CACHE = CACHE_PREFIX + 'v2-challenges';
const FILES = ['./', './index.html', './style.css', './mobile.css', './engine.js', './game.js', './pwa.js', './manifest.webmanifest', './fish-head.png', './fish-head.ico', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];
const ROOT = new URL('./', self.location.href);
const knownPaths = new Set(FILES.map(file => new URL(file, ROOT).pathname));
self.addEventListener('install', event => {
  // Fetch the complete release before activation. Existing JS keeps running;
  // the new cache takes effect on the player's next navigation, without reload.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new Request(file, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX) && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ROOT.origin || !knownPaths.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // A versioned, complete app cache keeps scripts and art consistent when offline.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return fetch(request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_OFFLINE') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const matches = await Promise.all(FILES.map(file => cache.match(new URL(file, ROOT).href)));
    event.ports[0]?.postMessage({ type: matches.every(Boolean) ? 'OFFLINE_READY' : 'OFFLINE_INCOMPLETE' });
  })());
});


