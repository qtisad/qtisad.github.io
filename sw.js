/* QtisaD service worker — offline-first app shell. Bump VERSION on every release. */
const VERSION = 'qtisad-v4';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Pages: network first (fresh updates), fall back to cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }
  // Static assets: cache first.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }))
  );
});
