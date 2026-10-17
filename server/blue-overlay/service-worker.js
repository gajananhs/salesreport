/* Sales Reporter — service worker for the server copy.
 * Network-first for everything, so changes made on the server show up
 * immediately; cached copies are used only when offline. API calls
 * (api/), approve.php and reset.php are never cached. */
const CACHE = 'sales-reporter-server-v2';
const SHELL = ['./', './offline.html', './manifest.json', './assets/css/style.css', 
  './assets/js/app.js', './assets/css/style.css'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('sales-reporter-server-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !req.url.startsWith(self.registration.scope)) return;
  const rel = req.url.slice(self.registration.scope.length);
  if (/^(api\/|approve\.php|reset\.php|uploads\/)/.test(rel)) return; // always live
  e.respondWith(fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(url.origin + url.pathname, copy)); }
    return res;
  }).catch(async () => {
    const hit = await caches.match(url.origin + url.pathname);
    if (hit) return hit;
    if (req.mode === 'navigate') return (await caches.match(new URL('./', self.registration.scope).href)) || caches.match(new URL('./offline.html', self.registration.scope).href);
    return new Response('', { status: 504 });
  }));
});
