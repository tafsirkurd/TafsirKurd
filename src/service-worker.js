const CACHE_NAME = 'tafsir-kurd-v1191';

// All files required to run the app fully offline.
// IMPORTANT: version strings here must match the ?v= params in index.html exactly.
// Mismatches cause cache misses — browser fetches from network instead of SW cache.
const PRECACHE = [
  // Core app shell — index.html intentionally excluded: always served fresh from APK
  '/app/app.min.js?v=1190',
  '/app/app-styles.min.css?v=3',
  // Prayer module
  '/prayer/prayer.cache.js?v=20260526',
  '/prayer/prayer.api.js?v=20260604',
  '/prayer/prayer.logic.js?v=20260326b',
  '/prayer/prayer.notifications.android.js?v=20260602b',
  '/prayer/prayer.ui.js?v=20260607',
  // Gencine / books module (lazily loaded but pre-cached for offline)
  '/dhikr/dhikr.js?v=20260612a',
  '/dhikr/pdf-store.js?v=20260612a',
  '/dhikr/dua-data.js?v=20260326b',
  '/dhikr/smart-dhikr.js?v=60',
  // i18n
  '/i18n/i18n.min.js?v=20260611a',
  '/i18n/kmr-bundled.js?v=20260612a',
  '/i18n/kmr.json',
  // Data
  '/data/quran.json',
  '/data/kurdish_tafsir.json',
  '/data/mushaf-v4-pages.json?v=2',
  // Styles
  '/styles/mobile-optimize.css',
  // Core utils
  '/utils/supabase.js?v=20260326b',
  '/utils/fast-scroll.js?v=20260503',
  '/utils/console-cleaner.js?v=2',
  '/utils/kurdish-numbers.js',
  '/utils/auto-kurdish-numbers.js',
  '/utils/notification-messages.js',
  '/utils/theme-loader.js',
  '/utils/footer-loader.js',
  '/utils/secure-storage.js',
  '/utils/cloud-sync.js',
  // Audio & Qibla
  '/audio-cache.js?v=20260406a',
  '/qibla/qibla.js?v=20260417',
  // Fonts & icons
  '/assets/fonts/fonts.css?v=17',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-regular.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-600.woff2',
  '/assets/fonts/hafs.woff2',
  '/assets/fonts/amiri-quran-v1-arabic-regular.woff2',
  '/assets/fonts/surah-name-v4.woff2',
  '/assets/fonts/surah-name-v2.woff2',
  '/assets/fontawesome/all.min.css',
  '/assets/fontawesome/webfonts/fa-solid-900.woff2',
  '/assets/fontawesome/webfonts/fa-regular-400.woff2',
  '/assets/fontawesome/webfonts/fa-brands-400.woff2',
  // Font manager
  '/app/quran-font-manager.js?v=20260506',
  // Images
  '/assets/images/logo.png',
  '/assets/images/TafsirKurd.png?v=3',
  '/assets/images/TafsirKurd-green.png',
  '/assets/images/splash-light.png',
  '/assets/images/splash-dark.png',
  '/assets/images/splash-parchment.png',
  '/assets/images/splash-emerald.png',
  '/assets/icons/genc-asma-bg.webp',
  '/manifest.json'
];

// Same-origin API endpoints to cache with stale-while-revalidate
const SWR_PATTERNS = [
  '/prayer-kurd',
  '/config'
];

// ── Install: pre-cache everything needed to run offline ──────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        PRECACHE.map(url =>
          cache.add(url).catch(() => {/* ignore individual failures */})
        )
      );
    })
  );
});

// ── Activate: clean up old caches immediately ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: smart caching strategies ──────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = req.url;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Skip non-HTTP schemes (chrome-extension, capacitor://, etc.)
  if (!url.startsWith('http')) return;

  const reqUrl = new URL(url);
  const isOwnOrigin = reqUrl.origin === self.location.origin;

  // ── Remote QCF mushaf fonts: cache-first (immutable per page number) ────
  // iOS strips local .bin files; iOS/web both fall back to this Cloudflare Worker.
  // Once cached the font loads instantly — Mushaf feels native-fast offline.
  if (url.includes('qpc-v4-fonts.tefsirkurd.workers.dev')) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req, { mode: 'cors' }).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(req, res.clone())).catch(() => {});
          }
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // ── External domains: pass through (Supabase, YouTube, CDNs, analytics) ──
  if (!isOwnOrigin) return;

  // ── Prayer static JSON: stale-while-revalidate ──────────────────────────────
  // Serve cached copy instantly when available so Prayer tab works offline.
  // Always revalidate in background — corrections deployed via fetch-prayer-year.js
  // propagate on the very next online visit (same session), not only after a cache
  // expiry. First visit (online) populates the cache; subsequent offline visits use it.
  if (reqUrl.pathname.startsWith('/prayer-data/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(res => {
            if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
            return res;
          }).catch(() => null);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // ── Same-origin API calls: stale-while-revalidate ─────────────────────────
  // Returns cached response instantly, updates cache in background
  const isSWR = SWR_PATTERNS.some(p => reqUrl.pathname.startsWith(p));
  if (isSWR) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(fresh => {
            if (fresh && fresh.status === 200) {
              cache.put(req, fresh.clone());
            }
            return fresh;
          }).catch(() => null);
          // Serve cache instantly if available, otherwise wait for network
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // ── Large proxied content: network passthrough — never cache ─────────────
  // /pdf-proxy streams multi-MB book PDFs. Caching them here would duplicate
  // pdf-store.js's IndexedDB copy and bloat origin storage until the browser
  // quota-evicts everything (including IDB-cached quran/tafsir data).
  if (reqUrl.pathname.startsWith('/pdf-proxy')) return;

  // ── HTML pages: always fetch fresh — never serve stale cached HTML ──────
  // index.html references versioned JS/CSS; serving a cached old index.html would
  // load old JS for 0.5s until the new SW activates. Since APK assets are local
  // (no real network latency), fetch() is instant and always returns the current build.
  if (req.mode === 'navigate' || req.destination === 'document' || url.endsWith('.html')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // ── Everything else (JS, CSS, fonts, images): cache first ─────────────────
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(req, res.clone())).catch(() => {});
        }
        return res;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});

// ── Background push notifications ────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title = (data.notification && data.notification.title) || data.title || 'TafsirKurd';
  const body  = (data.notification && data.notification.body)  || data.body  || '';
  const icon  = '/assets/images/favicon-96x96.png';
  const badge = '/assets/images/favicon-96x96.png';
  const image = (data.notification && data.notification.image) || data.image || null;
  const extra = data.data || {};

  const options = { body, icon, badge, data: extra, dir: 'rtl', lang: 'ku' };
  if (image) options.image = image;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const extra = event.notification.data || {};
  const url = '/app/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/app/') && 'focus' in c) {
          c.postMessage({ type: 'NOTIF_TAP', extra });
          return c.focus();
        }
      }
      return clients.openWindow(url + (extra.type ? '?notif=' + extra.type : ''));
    })
  );
});

// ── Message: force update ─────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
