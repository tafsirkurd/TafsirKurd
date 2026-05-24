const CACHE_NAME = 'tafsir-kurd-v840';

// All files required to run the app fully offline
// NOTE: /data/surahs/ and /data/tafsir/ JSON files are NOT precached here.
// They are runtime-cached on first access via the fetch handler, and the
// background prefetch in app-init.js (CONC=20) fills the cache within seconds.
// Precaching all 228 JSON files at install floods the network on cold start,
// causing severe LCP regression on first visit.
const PRECACHE = [
  // Core app shell
  '/app/index.html',
  '/app/manifest.json',
  '/audio-cache.js?v=20260406a',
  '/audio-downloads.js?v=1',
  '/rating.js?v=20260401a',
  '/qibla/qibla.js?v=20260417',
  '/quran/search.js?v=20260520',
  '/app/app-storage.js?v=20260525',
  '/app/app-core.js?v=20260525',
  '/app/app-init.js?v=20260607',
  '/app/app-notifications.js?v=20260606',
  '/app/app-search.js?v=20260525',
  '/app/app-quran.js?v=20260607',
  '/app/app-audio.js?v=20260525',
  '/app/app-goals.js?v=20260525',
  '/app/app-settings.js?v=20260530',
  '/app/app-sync.js?v=20260527',
  '/app/app-profile.js?v=20260525',
  '/app/app-islamvoice.js?v=20260525',
  '/app/app-start.js?v=20260525',
  // Prayer module
  '/prayer/prayer.api.js?v=20260501',
  '/prayer/prayer.cache.js?v=20260501',
  '/prayer/prayer.logic.js?v=20260326b',
  '/prayer/prayer.notifications.android.js?v=20260416',
  '/prayer/prayer.ui.js?v=20260520',
  // Gencine module
  '/dhikr/smart-dhikr.js?v=33',
  '/dhikr/dhikr.js?v=20260569',
  '/dhikr/dua-data.js?v=20260326b',
  // i18n
  '/i18n/i18n.js?v=20260517',
  '/i18n/kmr-bundled.js?v=20260518b',
  '/i18n/kmr.json',
  // Styles
  '/app/app.css?v=20260607',
  '/styles/mobile-optimize.css',
  // Utils
  '/utils/fast-scroll.js?v=20260503',
  '/utils/console-cleaner.js?v=2',
  '/utils/app-error-reporter.js?v=1',
  '/utils/supabase.js?v=20260326b',
  '/utils/kurdish-numbers.js',
  '/utils/auto-kurdish-numbers.js',
  '/utils/notification-messages.js',
  '/utils/notification-scheduler.js',
  '/utils/theme-loader.js',
  '/utils/footer-loader.js',
  '/utils/secure-storage.js',
  '/utils/cloud-sync.js',
  // Fonts & icons
  '/assets/fonts/fonts.css',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-regular.woff2?v=17',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-600.woff2?v=17',
  '/assets/fonts/hafs.woff2?v=17',
  '/assets/fonts/amiri-quran-v1-arabic-regular.woff2?v=17',
  // SurahName decorative fonts — required for Quran grid calligraphy
  '/assets/fonts/surah-name-v4.woff2?v=17',
  '/assets/fonts/surah-name-v2.woff2?v=1',
  '/assets/fonts/scheherazade-new-400.woff2?v=1',
  '/assets/fontawesome/all.min.css?v=17',
  '/assets/fontawesome/webfonts/fa-solid-900.woff2',
  '/assets/fontawesome/webfonts/fa-regular-400.woff2',
  '/assets/fontawesome/webfonts/fa-brands-400.woff2',
  // Font manager must be offline-available
  '/app/quran-font-manager.js?v=20260506',
  // Images
  '/assets/images/logo.png',
  '/assets/images/TafsirKurd.png?v=3',
  '/assets/images/TafsirKurd-green.png',
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

  // ── HTML pages: network first, fall back to cache ─────────────────────────
  if (req.mode === 'navigate' || req.destination === 'document' || url.endsWith('.html')) {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(req, res.clone())).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req).then(cached => cached || caches.match('/app/index.html'))
      )
    );
    return;
  }

  // ── Everything else (JS, CSS, fonts, images, data JSON): cache first ──────
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
