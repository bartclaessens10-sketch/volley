// Volley: houdt de app zelf bij op de gsm, zodat ze snel opent.
// De filmpjes zelf komen altijd van Instagram, TikTok of YouTube.
const CACHE = 'volley-v1';
const SCHIL = ['./', 'index.html', 'kies.html', 'bewaar.html', 'instellen.html', 'app.js', 'style.css',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SCHIL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok && !u.search) { const kopie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
