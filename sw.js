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
const CACHE = 'mm-shell-v1';
const CORE = ['./', 'index.html', 'manifest.json', 'logo.png', 'icon-180.png', 'icon-512.png'];
const CDN_HOSTS = [
  'cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com',
  'fonts.googleapis.com', 'fonts.gstatic.com', 'esm.sh', 'unpkg.com',
];

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
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const resp = await fetch(req);
      if (resp.ok || resp.type === 'opaque') (await caches.open(CACHE)).put(req, resp.clone());
      return resp;
    })());
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith((async () => {
      try {
        const resp = await fetch(req);
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
