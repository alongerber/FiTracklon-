// ════════════════════════════════════════════════════════════════════
// מִשְׁקַלּוּת Service Worker v2.5 — offline-first, auto-invalidate cache
// ════════════════════════════════════════════════════════════════════

const CACHE = 'mishkalut-v25';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './logo-welcome.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Never cache /api/ — always fresh
  if (url.pathname.startsWith('/api/')) return;

  // Navigation request — network first
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return r;
      }).catch(() => caches.match(request).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  if (sameOrigin) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(r => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return r;
      }).catch(() => cached))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(r => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return r;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
