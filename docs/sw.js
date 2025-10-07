
const CACHE_NAME = 'hub-uno-nebula-v1';
const toCache = [
  './index.updated.html',
  './HUB-UNO__sphere-v11.html',
  './HUB-UNO__sphere-brava.html',
  './HUB-UNO__sphere-atlas3d-bloom.html',
  './HUB-UNO__sphere-v14-archetypes.html',
  './manifest.webmanifest'
];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(toCache)));
  self.skipWaiting();
});
self.addEventListener('activate', evt => { evt.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', evt => {
  evt.respondWith(caches.match(evt.request).then(r => r || fetch(evt.request).catch(()=>caches.match('./index.updated.html'))));
});
