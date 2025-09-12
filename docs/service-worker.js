const CACHE_NAME = 'dualhub-v1';
const CORE = [
  './',
  './Hub_Dual_perfect.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE)).then(self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-first for apps/apps.json to avoid stale app lists
  if (url.pathname.endsWith('/apps/apps.json')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (GET only)
  if (e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        return resp;
      }))
    );
  }
});
