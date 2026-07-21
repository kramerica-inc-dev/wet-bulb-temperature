// Service worker: app-shell offline beschikbaar, weerdata altijd vers via netwerk.
var CACHE = 'wbt-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './fonts/sora-latin.woff2',
  './fonts/plexmono-400-latin.woff2',
  './fonts/plexmono-500-latin.woff2',
  './fonts/plexmono-600-latin.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  // API-verkeer (weer, geocoding) nooit cachen: de app bewaart zelf de laatste meting.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Network-first voor de pagina zelf, zodat updates doorkomen; cache als offline-fallback.
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Statische assets (fonts, icon, manifest): cache-first.
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
