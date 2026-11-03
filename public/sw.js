/* FOCO offline worker — release 2026-11-03-refresh1.
 * Network-first navigation with a strict revalidation of the application shell.
 * Old caches are removed on activation; user data/local auth is never altered.
 */
const CACHE_NAME = 'foco-shell-20261103-refresh1';
const APP_ROOT = '/FOCO/';
const APP_ASSETS = [
  APP_ROOT,
  APP_ROOT + 'manifest.webmanifest',
  APP_ROOT + 'icons/foco.svg',
  APP_ROOT + 'assets/brand/foco-v6-reference-vector.svg',
  APP_ROOT + 'icons/foco-192.png',
  APP_ROOT + 'icons/foco-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // GitHub Pages caches HTML at the CDN/browser layer; fetch the shell fresh.
      await Promise.all(APP_ASSETS.map(async (url) => {
        try {
          const response = await fetch(new Request(url, {cache: 'no-store'}));
          if (response.ok) await cache.put(url, response);
        } catch { /* Keep online installation functional even if one asset fails. */ }
      }));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key =>
        key.startsWith('foco-shell-') && key !== CACHE_NAME
      ).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT)) return;

  // Never interfere with API data or third-party network calls.
  const isDocument = request.mode === 'navigate' || url.pathname === APP_ROOT || url.pathname.endsWith('/index.html');
  if (isDocument && url.pathname.endsWith('/atualizar.html')) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(isDocument
        ? new Request(request, { cache: 'no-store' })
        : request);
      if (fresh.ok && fresh.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, fresh.clone()).catch(() => {});
        if (isDocument) await cache.put(APP_ROOT, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (isDocument) return (await caches.match(APP_ROOT)) || Response.error();
      return Response.error();
    }
  })());
});
