/* QtisaD service worker — offline-first app shell. Bump VERSION on every release. */
const VERSION = 'qtisad-v5';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const NET_TIMEOUT = 4000; // ms: على شبكة بطيئة نعرض النسخة المخزنة بدل الانتظار

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

function isAppPage(url) {
  const p = url.pathname;
  return p === '/' || p.endsWith('/index.html') || p === new URL('./', self.location).pathname;
}

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // Only the app page is cached as the offline shell; other pages (privacy.html) are passed through.
    if (!isAppPage(url)) {
      e.respondWith(fetch(req).catch(() => caches.match('index.html')));
      return;
    }
    e.respondWith(
      fetchWithTimeout(req, NET_TIMEOUT)
        .then(res => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put('index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('index.html').then(hit => hit || fetch(req)))
    );
    return;
  }

  // Static assets: cache first, only cache successful responses.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
