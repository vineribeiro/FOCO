const CACHE_NAME = 'foco-shell-v1';
const APP_ROOT = '/FOCO/';
const APP_ASSETS = [APP_ROOT, APP_ROOT + 'manifest.webmanifest', APP_ROOT + 'icons/foco-192.png', APP_ROOT + 'icons/foco-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(APP_ASSETS.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('foco-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT)) return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return (await caches.match(APP_ROOT)) || Response.error();
      return Response.error();
    })
  );
});
