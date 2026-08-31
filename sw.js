// DigitalPaani Maintenance Ops — service worker
//
// Offline strategy:
//   - Own files (index.html, app.js, icons): network-first so updates land the
//     moment they deploy; the last good copy serves as the offline fallback.
//   - CDN libraries (Tailwind, supabase-js, xlsx, jsPDF, fonts): cache-first —
//     they're versioned and effectively immutable, and the app can't boot
//     offline without them.
//   - Supabase API + all non-GET requests: network only, never cached. Data
//     freshness and writes are the app's job (it keeps its own snapshot).
const CACHE = 'mm-shell-v4';   // v4: shell navigations bypass the HTTP cache (see fetch)
// Bare same-origin paths (retrieval uses ignoreSearch, so app.js matches
// app.js?v=N) plus the CDN libraries — offline must work after ONE visit.
const CORE = [
  './', 'index.html', 'manifest.json', 'logo.png', 'icon-180.png', 'icon-512.png',
  'app.js', 'supabase-config.js', 'tailwind.css',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];
const CDN_HOSTS = [
  'cdn.jsdelivr.net', 'cdnjs.cloudflare.com',
  'fonts.googleapis.com', 'fonts.gstatic.com', 'esm.sh', 'unpkg.com',
];
// Hosts whose requests stay no-cors (font files referenced from Google's CSS):
// their responses are opaque by nature, and the worst a bad cache entry can do
// is an ugly font. Everything else is fetched with CORS and must be resp.ok.
const OPAQUE_OK = ['fonts.gstatic.com', 'fonts.googleapis.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Best-effort precache — one flaky CDN must not block install.
    await Promise.allSettled(CORE.map((u) => c.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // writes: network only
  const url = new URL(req.url);
  if (url.hostname.endsWith('.supabase.co')) return;      // API: never cached

  if (CDN_HOSTS.includes(url.hostname)) {
    // Stale-while-revalidate: serve the cache instantly, refresh in the
    // background. A bad copy (captive-portal HTML cached as an opaque
    // response) heals itself on the next real network instead of freezing.
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const refresh = fetch(req).then((resp) => {
        // Script tags now carry crossorigin, so real status is visible -- a
        // captive portal's junk HTML is a redirect/non-ok, not cacheable. The
        // old `|| resp.type === 'opaque'` clause cached exactly that junk and
        // silently killed every Tailwind class on the page.
        const opaqueOk = resp.type === 'opaque' && OPAQUE_OK.includes(url.hostname);
        if (resp.ok || opaqueOk) cache.put(req, resp.clone());
        return resp;
      }).catch(() => null);
      if (hit) { e.waitUntil(refresh.then(() => {})); return hit; }
      const resp = await refresh;
      if (resp) return resp;
      throw new Error('offline');
    })());
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith((async () => {
      try {
        // index.html carries no ?v= (it cannot), so a host cache window could
        // serve yesterday's shell — which then loads yesterday's app.js. Ask
        // the network directly for navigations.
        const resp = await fetch(req.mode === 'navigate' ? new Request(req.url, { cache: 'no-store' }) : req);
        if (resp.ok) {
          const c = await caches.open(CACHE);
          // One copy per file: drop stale ?v=N variants before storing the new one.
          for (const k of await c.keys()) {
            const ku = new URL(k.url);
            if (ku.origin === url.origin && ku.pathname === url.pathname && ku.search !== url.search) {
              await c.delete(k);
            }
          }
          c.put(req, resp.clone());
        }
        return resp;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const shell = await caches.match('index.html', { ignoreSearch: true });
          if (shell) return shell;
        }
        throw err;
      }
    })());
  }
});
