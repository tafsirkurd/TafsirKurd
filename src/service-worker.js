const CACHE_NAME = 'tafsir-kurd-v1264';

// All files required to run the app fully offline.
// IMPORTANT: version strings here must match the ?v= params in index.html exactly.
// Mismatches cause cache misses — browser fetches from network instead of SW cache.
const PRECACHE = [
  // Core app shell — index.html intentionally excluded: always served fresh from APK
  '/utils/app-hardening.js?v=2',
  '/app/app.min.js?v=1211',
  '/utils/book-spotlight.js?v=12',
  '/app/app-styles.min.css?v=8',
  // Prayer module
  '/prayer/prayer.cache.js?v=20260526',
  '/prayer/prayer.api.js?v=20260604',
  '/prayer/prayer.logic.js?v=20260326b',
  '/prayer/prayer.notifications.android.js?v=20260602b',
  '/prayer/prayer.ui.js?v=20260616d',
  // Gencine / books module (lazily loaded but pre-cached for offline)
  '/dhikr/dhikr.js?v=20260620b',
  '/dhikr/pdf-store.js?v=20260612a',
  '/dhikr/dua-data.js?v=20260326b',
  '/dhikr/smart-dhikr.js?v=88',
  // i18n
  '/i18n/i18n.min.js?v=20260619a',
  '/i18n/kmr-bundled.js?v=20260620b',
  '/i18n/kmr.json',
  // Data
  '/data/quran.json',
  '/data/kurdish_tafsir.json',
  '/data/mushaf-v4-pages.json?v=2',
  // Prayer static annual JSON â€” all 20 cities Ã— 2 years bundled for offline
  // Covers fresh-install offline and 30-day offline month-boundary on web
  '/prayer-data/2026/Akre.json',
  '/prayer-data/2026/Bardarash.json',
  '/prayer-data/2026/Daquq.json',
  '/prayer-data/2026/Darbandikhan.json',
  '/prayer-data/2026/Duhok.json',
  '/prayer-data/2026/DuzKhormatou.json',
  '/prayer-data/2026/Erbil.json',
  '/prayer-data/2026/Halabja.json',
  '/prayer-data/2026/Kalar.json',
  '/prayer-data/2026/Kfry.json',
  '/prayer-data/2026/Kirkuk.json',
  '/prayer-data/2026/Koya.json',
  '/prayer-data/2026/Makhmur.json',
  '/prayer-data/2026/Mandali.json',
  '/prayer-data/2026/Mosul.json',
  '/prayer-data/2026/Qaladze.json',
  '/prayer-data/2026/Qarahanjir.json',
  '/prayer-data/2026/Rania.json',
  '/prayer-data/2026/Sulaymaniyah.json',
  '/prayer-data/2026/Zakho.json',
  '/prayer-data/2027/Akre.json',
  '/prayer-data/2027/Bardarash.json',
  '/prayer-data/2027/Daquq.json',
  '/prayer-data/2027/Darbandikhan.json',
  '/prayer-data/2027/Duhok.json',
  '/prayer-data/2027/DuzKhormatou.json',
  '/prayer-data/2027/Erbil.json',
  '/prayer-data/2027/Halabja.json',
  '/prayer-data/2027/Kalar.json',
  '/prayer-data/2027/Kfry.json',
  '/prayer-data/2027/Kirkuk.json',
  '/prayer-data/2027/Koya.json',
  '/prayer-data/2027/Makhmur.json',
  '/prayer-data/2027/Mandali.json',
  '/prayer-data/2027/Mosul.json',
  '/prayer-data/2027/Qaladze.json',
  '/prayer-data/2027/Qarahanjir.json',
  '/prayer-data/2027/Rania.json',
  '/prayer-data/2027/Sulaymaniyah.json',
  '/prayer-data/2027/Zakho.json',
  // Styles
  '/styles/mobile-optimize.css',
  // Core utils
  '/utils/app-error-reporter.js?v=2',
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

// â”€â”€ Install: pre-cache everything needed to run offline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Activate: clean up old caches immediately â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// â”€â”€ Fetch: smart caching strategies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = req.url;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Skip non-HTTP schemes (chrome-extension, capacitor://, etc.)
  if (!url.startsWith('http')) return;

  const reqUrl = new URL(url);
  const isOwnOrigin = reqUrl.origin === self.location.origin;

  // â”€â”€ Remote QCF mushaf fonts: cache-first (immutable per page number) â”€â”€â”€â”€
  // iOS strips local .bin files; iOS/web both fall back to this Cloudflare Worker.
  // Once cached the font loads instantly â€” Mushaf feels native-fast offline.
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

  // â”€â”€ External domains: pass through (Supabase, YouTube, CDNs, analytics) â”€â”€
  if (!isOwnOrigin) return;

  // â”€â”€ Prayer static JSON: stale-while-revalidate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Serve cached copy instantly when available so Prayer tab works offline.
  // Always revalidate in background â€” corrections deployed via fetch-prayer-year.js
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

  // â”€â”€ Same-origin API calls: stale-while-revalidate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Large proxied content: network passthrough â€” never cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // /pdf-proxy streams multi-MB book PDFs. Caching them here would duplicate
  // pdf-store.js's IndexedDB copy and bloat origin storage until the browser
  // quota-evicts everything (including IDB-cached quran/tafsir data).
  if (reqUrl.pathname.startsWith('/pdf-proxy')) return;

  // â”€â”€ HTML pages: always fetch fresh â€” never serve stale cached HTML â”€â”€â”€â”€â”€â”€
  // index.html references versioned JS/CSS; serving a cached old index.html would
  // load old JS for 0.5s until the new SW activates. Since APK assets are local
  // (no real network latency), fetch() is instant and always returns the current build.
  if (req.mode === 'navigate' || req.destination === 'document' || url.endsWith('.html')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // â”€â”€ Everything else (JS, CSS, fonts, images): cache first â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Background push notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Message: force update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});


