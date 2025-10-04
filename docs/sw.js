// DualHub PWA Service Worker — 2025-10-04T06:02:31.846084
const CACHE_VERSION = 'kobllux-v2';
const CORE = [
  './','./index.html','./offline.html',
  './manifest.webmanifest',
  './icons/pwa-192.png','./icons/pwa-512.png','./icons/maskable-512.png',
  './sounds/ui/click.wav','./sounds/ui/open.wav','./sounds/ui/close.wav','./sounds/ui/hover.wav',
  './sounds/ui/nav.wav','./sounds/ui/tab.wav','./sounds/ui/success.wav','./sounds/ui/error.wav','./sounds/ui/warn.wav','./sounds/ui/tech-pop.wav',
  './dual_multiagent_v1.js','./dual_multiagent_v12_locked.js','./openrouter_hardlock_model_v1.js',
  './archetypes/atlas.html','./archetypes/nova.html','./archetypes/vitalis.html','./archetypes/pulse.html',
  './archetypes/artemis.html','./archetypes/serena.html','./archetypes/kaos.html','./archetypes/genus.html',
  './archetypes/lumine.html','./archetypes/solus.html','./archetypes/rhea.html','./archetypes/aion.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(CORE)).catch(()=>{}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Routing: HTML navigations network-first; local assets cache-first; jsdelivr stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, net.clone());
        return net;
      } catch (err) {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match('./offline.html')) || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(net => { cache.put(req, net.clone()); return net; }).catch(()=>cached);
      return cached || fetchPromise;
    })());
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const net = await fetch(req);
        cache.put(req, net.clone());
        return net;
      } catch (err) {
        return cached || Response.error();
      }
    })());
  }
});
