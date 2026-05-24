const CACHE_NAME = 'tafsir-kurd-v821';

// All files required to run the app fully offline
const PRECACHE = [
  // Core app shell
  '/app/index.html',
  '/app/app-storage.js?v=20260525',
  '/app/app-core.js?v=20260525',
  '/app/app-init.js?v=20260528',
  '/app/app-notifications.js?v=20260525',
  '/app/app-search.js?v=20260525',
  '/app/app-quran.js?v=20260527',
  '/app/app-audio.js?v=20260525',
  '/app/app-goals.js?v=20260525',
  '/app/app-settings.js?v=20260525',
  '/app/app-sync.js?v=20260527',
  '/app/app-profile.js?v=20260525',
  '/app/app-islamvoice.js?v=20260525',
  '/app/app-start.js?v=20260525',
  // Prayer module
  '/prayer/prayer.api.js',
  '/prayer/prayer.cache.js',
  '/prayer/prayer.logic.js',
  '/prayer/prayer.notifications.android.js',
  '/prayer/prayer.ui.js',
  // Gencine module
  '/dhikr/dhikr.js?v=20260569',
  '/dhikr/dua-data.js',
  // i18n
  '/i18n/i18n.js',
  '/i18n/kmr.json',
  // Data — per-surah files (~8KB each) instead of monolithic quran.json (1.55MB)
  '/data/surahs/surah-1.json',
  '/data/surahs/surah-2.json',
  '/data/surahs/surah-3.json',
  '/data/surahs/surah-4.json',
  '/data/surahs/surah-5.json',
  '/data/surahs/surah-6.json',
  '/data/surahs/surah-7.json',
  '/data/surahs/surah-8.json',
  '/data/surahs/surah-9.json',
  '/data/surahs/surah-10.json',
  '/data/surahs/surah-11.json',
  '/data/surahs/surah-12.json',
  '/data/surahs/surah-13.json',
  '/data/surahs/surah-14.json',
  '/data/surahs/surah-15.json',
  '/data/surahs/surah-16.json',
  '/data/surahs/surah-17.json',
  '/data/surahs/surah-18.json',
  '/data/surahs/surah-19.json',
  '/data/surahs/surah-20.json',
  '/data/surahs/surah-21.json',
  '/data/surahs/surah-22.json',
  '/data/surahs/surah-23.json',
  '/data/surahs/surah-24.json',
  '/data/surahs/surah-25.json',
  '/data/surahs/surah-26.json',
  '/data/surahs/surah-27.json',
  '/data/surahs/surah-28.json',
  '/data/surahs/surah-29.json',
  '/data/surahs/surah-30.json',
  '/data/surahs/surah-31.json',
  '/data/surahs/surah-32.json',
  '/data/surahs/surah-33.json',
  '/data/surahs/surah-34.json',
  '/data/surahs/surah-35.json',
  '/data/surahs/surah-36.json',
  '/data/surahs/surah-37.json',
  '/data/surahs/surah-38.json',
  '/data/surahs/surah-39.json',
  '/data/surahs/surah-40.json',
  '/data/surahs/surah-41.json',
  '/data/surahs/surah-42.json',
  '/data/surahs/surah-43.json',
  '/data/surahs/surah-44.json',
  '/data/surahs/surah-45.json',
  '/data/surahs/surah-46.json',
  '/data/surahs/surah-47.json',
  '/data/surahs/surah-48.json',
  '/data/surahs/surah-49.json',
  '/data/surahs/surah-50.json',
  '/data/surahs/surah-51.json',
  '/data/surahs/surah-52.json',
  '/data/surahs/surah-53.json',
  '/data/surahs/surah-54.json',
  '/data/surahs/surah-55.json',
  '/data/surahs/surah-56.json',
  '/data/surahs/surah-57.json',
  '/data/surahs/surah-58.json',
  '/data/surahs/surah-59.json',
  '/data/surahs/surah-60.json',
  '/data/surahs/surah-61.json',
  '/data/surahs/surah-62.json',
  '/data/surahs/surah-63.json',
  '/data/surahs/surah-64.json',
  '/data/surahs/surah-65.json',
  '/data/surahs/surah-66.json',
  '/data/surahs/surah-67.json',
  '/data/surahs/surah-68.json',
  '/data/surahs/surah-69.json',
  '/data/surahs/surah-70.json',
  '/data/surahs/surah-71.json',
  '/data/surahs/surah-72.json',
  '/data/surahs/surah-73.json',
  '/data/surahs/surah-74.json',
  '/data/surahs/surah-75.json',
  '/data/surahs/surah-76.json',
  '/data/surahs/surah-77.json',
  '/data/surahs/surah-78.json',
  '/data/surahs/surah-79.json',
  '/data/surahs/surah-80.json',
  '/data/surahs/surah-81.json',
  '/data/surahs/surah-82.json',
  '/data/surahs/surah-83.json',
  '/data/surahs/surah-84.json',
  '/data/surahs/surah-85.json',
  '/data/surahs/surah-86.json',
  '/data/surahs/surah-87.json',
  '/data/surahs/surah-88.json',
  '/data/surahs/surah-89.json',
  '/data/surahs/surah-90.json',
  '/data/surahs/surah-91.json',
  '/data/surahs/surah-92.json',
  '/data/surahs/surah-93.json',
  '/data/surahs/surah-94.json',
  '/data/surahs/surah-95.json',
  '/data/surahs/surah-96.json',
  '/data/surahs/surah-97.json',
  '/data/surahs/surah-98.json',
  '/data/surahs/surah-99.json',
  '/data/surahs/surah-100.json',
  '/data/surahs/surah-101.json',
  '/data/surahs/surah-102.json',
  '/data/surahs/surah-103.json',
  '/data/surahs/surah-104.json',
  '/data/surahs/surah-105.json',
  '/data/surahs/surah-106.json',
  '/data/surahs/surah-107.json',
  '/data/surahs/surah-108.json',
  '/data/surahs/surah-109.json',
  '/data/surahs/surah-110.json',
  '/data/surahs/surah-111.json',
  '/data/surahs/surah-112.json',
  '/data/surahs/surah-113.json',
  '/data/surahs/surah-114.json',
  // Tafsir — per-surah files (~14KB each) instead of monolithic kurdish_tafsir.json (3MB)
  '/data/tafsir/tafsir-1.json',
  '/data/tafsir/tafsir-2.json',
  '/data/tafsir/tafsir-3.json',
  '/data/tafsir/tafsir-4.json',
  '/data/tafsir/tafsir-5.json',
  '/data/tafsir/tafsir-6.json',
  '/data/tafsir/tafsir-7.json',
  '/data/tafsir/tafsir-8.json',
  '/data/tafsir/tafsir-9.json',
  '/data/tafsir/tafsir-10.json',
  '/data/tafsir/tafsir-11.json',
  '/data/tafsir/tafsir-12.json',
  '/data/tafsir/tafsir-13.json',
  '/data/tafsir/tafsir-14.json',
  '/data/tafsir/tafsir-15.json',
  '/data/tafsir/tafsir-16.json',
  '/data/tafsir/tafsir-17.json',
  '/data/tafsir/tafsir-18.json',
  '/data/tafsir/tafsir-19.json',
  '/data/tafsir/tafsir-20.json',
  '/data/tafsir/tafsir-21.json',
  '/data/tafsir/tafsir-22.json',
  '/data/tafsir/tafsir-23.json',
  '/data/tafsir/tafsir-24.json',
  '/data/tafsir/tafsir-25.json',
  '/data/tafsir/tafsir-26.json',
  '/data/tafsir/tafsir-27.json',
  '/data/tafsir/tafsir-28.json',
  '/data/tafsir/tafsir-29.json',
  '/data/tafsir/tafsir-30.json',
  '/data/tafsir/tafsir-31.json',
  '/data/tafsir/tafsir-32.json',
  '/data/tafsir/tafsir-33.json',
  '/data/tafsir/tafsir-34.json',
  '/data/tafsir/tafsir-35.json',
  '/data/tafsir/tafsir-36.json',
  '/data/tafsir/tafsir-37.json',
  '/data/tafsir/tafsir-38.json',
  '/data/tafsir/tafsir-39.json',
  '/data/tafsir/tafsir-40.json',
  '/data/tafsir/tafsir-41.json',
  '/data/tafsir/tafsir-42.json',
  '/data/tafsir/tafsir-43.json',
  '/data/tafsir/tafsir-44.json',
  '/data/tafsir/tafsir-45.json',
  '/data/tafsir/tafsir-46.json',
  '/data/tafsir/tafsir-47.json',
  '/data/tafsir/tafsir-48.json',
  '/data/tafsir/tafsir-49.json',
  '/data/tafsir/tafsir-50.json',
  '/data/tafsir/tafsir-51.json',
  '/data/tafsir/tafsir-52.json',
  '/data/tafsir/tafsir-53.json',
  '/data/tafsir/tafsir-54.json',
  '/data/tafsir/tafsir-55.json',
  '/data/tafsir/tafsir-56.json',
  '/data/tafsir/tafsir-57.json',
  '/data/tafsir/tafsir-58.json',
  '/data/tafsir/tafsir-59.json',
  '/data/tafsir/tafsir-60.json',
  '/data/tafsir/tafsir-61.json',
  '/data/tafsir/tafsir-62.json',
  '/data/tafsir/tafsir-63.json',
  '/data/tafsir/tafsir-64.json',
  '/data/tafsir/tafsir-65.json',
  '/data/tafsir/tafsir-66.json',
  '/data/tafsir/tafsir-67.json',
  '/data/tafsir/tafsir-68.json',
  '/data/tafsir/tafsir-69.json',
  '/data/tafsir/tafsir-70.json',
  '/data/tafsir/tafsir-71.json',
  '/data/tafsir/tafsir-72.json',
  '/data/tafsir/tafsir-73.json',
  '/data/tafsir/tafsir-74.json',
  '/data/tafsir/tafsir-75.json',
  '/data/tafsir/tafsir-76.json',
  '/data/tafsir/tafsir-77.json',
  '/data/tafsir/tafsir-78.json',
  '/data/tafsir/tafsir-79.json',
  '/data/tafsir/tafsir-80.json',
  '/data/tafsir/tafsir-81.json',
  '/data/tafsir/tafsir-82.json',
  '/data/tafsir/tafsir-83.json',
  '/data/tafsir/tafsir-84.json',
  '/data/tafsir/tafsir-85.json',
  '/data/tafsir/tafsir-86.json',
  '/data/tafsir/tafsir-87.json',
  '/data/tafsir/tafsir-88.json',
  '/data/tafsir/tafsir-89.json',
  '/data/tafsir/tafsir-90.json',
  '/data/tafsir/tafsir-91.json',
  '/data/tafsir/tafsir-92.json',
  '/data/tafsir/tafsir-93.json',
  '/data/tafsir/tafsir-94.json',
  '/data/tafsir/tafsir-95.json',
  '/data/tafsir/tafsir-96.json',
  '/data/tafsir/tafsir-97.json',
  '/data/tafsir/tafsir-98.json',
  '/data/tafsir/tafsir-99.json',
  '/data/tafsir/tafsir-100.json',
  '/data/tafsir/tafsir-101.json',
  '/data/tafsir/tafsir-102.json',
  '/data/tafsir/tafsir-103.json',
  '/data/tafsir/tafsir-104.json',
  '/data/tafsir/tafsir-105.json',
  '/data/tafsir/tafsir-106.json',
  '/data/tafsir/tafsir-107.json',
  '/data/tafsir/tafsir-108.json',
  '/data/tafsir/tafsir-109.json',
  '/data/tafsir/tafsir-110.json',
  '/data/tafsir/tafsir-111.json',
  '/data/tafsir/tafsir-112.json',
  '/data/tafsir/tafsir-113.json',
  '/data/tafsir/tafsir-114.json',
  // Styles
  '/app/app.css?v=20260528',
  '/styles/mobile-optimize.css',
  // Utils
  '/utils/fast-scroll.js',
  '/utils/console-cleaner.js?v=2',
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
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-regular.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-600.woff2',
  '/assets/fonts/hafs.woff2',
  '/assets/fonts/amiri-quran-v1-arabic-regular.woff2',
  // SurahName decorative fonts — required for Quran grid calligraphy
  '/assets/fonts/surah-name-v4.woff2',
  '/assets/fonts/surah-name-v2.woff2',
  '/assets/fontawesome/all.min.css',
  '/assets/fontawesome/webfonts/fa-solid-900.woff2',
  '/assets/fontawesome/webfonts/fa-regular-400.woff2',
  '/assets/fontawesome/webfonts/fa-brands-400.woff2',
  // Font manager must be offline-available
  '/app/quran-font-manager.js',
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
