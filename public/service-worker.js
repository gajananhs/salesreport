/* Sales Reporter — service worker
 *
 * Caches only the app shell (this GitHub Pages folder). Calls to the
 * Sales Reporter server (another origin) are never cached — data is
 * always live.
 *
 * BUILD_ID is replaced by scripts/build.mjs with a hash of every shipped
 * file, so each deploy gets a fresh cache and old caches are removed.
 * PRECACHE must list every file the app needs offline; the build fails if
 * a file is missing from this list or listed but absent.
 *
 * All URLs are relative to this file, so the worker works unchanged from a
 * GitHub Pages project path (https://<user>.github.io/<repo>/).
 */
const BUILD_ID = 'dev';
const CACHE_PREFIX = 'sales-reporter-';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${BUILD_ID}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${BUILD_ID}`;

const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './lead_routing.html',
  './assets/css/fonts.css',
  './assets/css/style.css',
  './assets/css/theme.css',
  './assets/css/lead-routing-theme.css',
  './assets/js/config.js',
  './assets/js/logbook-tasks.js',
  './assets/js/app.js',
  './assets/js/pwa.js',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-16.png',
  './assets/icons/favicon-32.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/icon-512.png',
  './assets/fonts/fraunces-latin-500-normal.woff2',
  './assets/fonts/fraunces-latin-600-normal.woff2',
  './assets/fonts/fraunces-latin-700-normal.woff2',
  './assets/fonts/fraunces-latin-ext-500-normal.woff2',
  './assets/fonts/fraunces-latin-ext-600-normal.woff2',
  './assets/fonts/fraunces-latin-ext-700-normal.woff2',
  './assets/fonts/ibm-plex-mono-latin-500-normal.woff2',
  './assets/fonts/ibm-plex-mono-latin-ext-500-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-400-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-500-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-600-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-700-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-ext-400-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-ext-500-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-ext-600-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-ext-700-normal.woff2',
];

const SCOPE = self.registration.scope; // e.g. https://user.github.io/repo/
const abs = (p) => new URL(p, SCOPE).href;
const PRECACHE_URLS = new Set(PRECACHE.map(abs));
const INDEX_URL = abs('./index.html');
const OFFLINE_URL = abs('./offline.html');
const NAV_TIMEOUT_MS = 3500;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // cache:'reload' skips the HTTP cache so a deploy never precaches stale files
    await cache.addAll(PRECACHE.map((p) => new Request(abs(p), { cache: 'reload' })));
  })());
  // The page decides when to activate (see SKIP_WAITING below), except on
  // the very first install where there is nothing to replace.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !request.url.startsWith(SCOPE)) return; // leave other origins alone

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }
  const clean = url.origin + url.pathname;
  if (PRECACHE_URLS.has(clean)) {
    event.respondWith(cacheFirst(request, clean));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

/** Network first (fresh HTML after deploys), falling back to the cached shell, then the offline page. */
async function handleNavigation(event) {
  const cache = await caches.open(SHELL_CACHE);
  const url = new URL(event.request.url);
  const path = (url.origin + url.pathname).slice(SCOPE.length);
  const isShell = path === '' || path === 'index.html';
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    // 404s pass through: GitHub Pages' 404.html redirects to the app root.
    return preload || await withTimeout(fetch(event.request), NAV_TIMEOUT_MS);
  } catch (_) {
    if (isShell) {
      return (await cache.match(INDEX_URL)) || (await cache.match(OFFLINE_URL)) || offlineText();
    }
    // Any other path: send the browser to the app root so relative asset
    // URLs resolve against the right base, or show the offline page.
    if (await cache.match(INDEX_URL)) return Response.redirect(SCOPE, 302);
    return (await cache.match(OFFLINE_URL)) || offlineText();
  }
}
const offlineText = () => new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });

async function cacheFirst(request, key) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (_) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.ok && res.type === 'basic') cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await network) || new Response('', { status: 504, statusText: 'Offline' });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
