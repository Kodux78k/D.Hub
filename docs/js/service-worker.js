// Basic SW: cache-first for static, network-first for HTML
const CACHE = 'hub-pwa-' + (self.registration?.scope || '') + '-v1';
const STATIC = [
  '/docs/apps/wrapper.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  // HTML: network-first
  if (req.destination === 'document' || req.headers.get('accept')?.includes('text/html')) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
        return net;
      } catch (err) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        return cached || new Response('<h1>Offline</h1>', {headers:{'Content-Type':'text/html'}});
      }
    })());
    return;
  }

  // Others: cache-first
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    const net = await fetch(req);
    cache.put(req, net.clone());
    return net;
  })());
});
