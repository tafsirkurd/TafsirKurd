const CACHE_NAME = 'tafsir-kurd-v55-post-fix';
const urlsToCache = [
  '/',
  '/index.html',
  '/Quran.html',
  '/Dashboard.html',
  '/bookmarks.html',
  '/profile.html',
  '/goals.html',
  '/settings.html',
  '/login.html',
  '/onboarding.html',
  '/complete-signup.html',
  '/privacy-policy.html',
  '/terms-and-conditions.html',
  '/admin.html',
  '/data/quran.json',
  '/data/kurdish_tafsir.json',
  '/styles/Style.css',
  '/styles/mobile-optimize.css',
  '/utils/console-cleaner.js',
  '/utils/kurdish-numbers.js',
  '/utils/auto-kurdish-numbers.js',
  '/assets/fonts/fonts.css',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-regular.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-300.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-500.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-600.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-700.woff2',
  '/assets/fonts/hafs.woff2',
  '/assets/fonts/amiri-quran-v1-arabic-regular.woff2',
  '/assets/fonts/surah-name-v4.woff2',
  '/assets/fontawesome/all.min.css',
  '/assets/fontawesome/webfonts/fa-solid-900.woff2',
  '/assets/fontawesome/webfonts/fa-regular-400.woff2',
  '/assets/fontawesome/webfonts/fa-brands-400.woff2',
  '/assets/images/logo.png',
  '/manifest.json'
];

// Install event - FAST cache installation with immediate activation
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing v55-post-fix - Fixed POST request caching error');
  event.waitUntil(
    // Delete old caches FIRST for instant updates
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Open new cache and add resources with reload (bypass cache)
      return caches.open(CACHE_NAME);
    }).then(cache => {
      console.log('[ServiceWorker] Caching resources with INSTANT update strategy');
      // Use cache: 'reload' to always fetch fresh content
      return cache.addAll(urlsToCache.map(url => {
        return new Request(url, { cache: 'reload' });
      })).catch(error => {
        console.error('[ServiceWorker] Failed to cache some resources:', error);
      });
    })
  );
  // INSTANT activation - don't wait
  self.skipWaiting();
});

// Fetch event - NETWORK FIRST for HTML, CACHE FIRST for assets (instant updates!)
self.addEventListener('fetch', event => {
  // Skip service worker for API requests and external resources
  if (event.request.url.includes('googleapis.com') ||
      event.request.url.includes('googleusercontent.com') ||
      event.request.url.includes('accounts.google.com') ||
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('unsplash.com') ||
      event.request.url.includes('netlify/functions') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('cdn.jsdelivr.net') ||
      event.request.url.includes('googletagmanager.com') ||
      event.request.url.includes('google-analytics.com') ||
      event.request.url.includes('cloudflareinsights.com') ||
      event.request.url.includes('instagram.com')) {
    return;
  }

  // NETWORK FIRST for HTML pages (instant updates on refresh!)
  if (event.request.mode === 'navigate' ||
      event.request.destination === 'document' ||
      event.request.url.endsWith('.html')) {

    // Skip caching for POST requests
    if (event.request.method !== 'GET') {
      event.respondWith(fetch(event.request));
      return;
    }

    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .then(response => {
          // Cache the fresh HTML for offline use
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache).catch(err => {
                console.log('[ServiceWorker] Failed to cache:', err);
              });
            });
          }
          return response;
        })
        .catch(() => {
          // Offline - serve cached version
          return caches.match(event.request).then(cached => {
            return cached || caches.match('/Quran.html');
          });
        })
    );
    return;
  }

  // CACHE FIRST for CSS, JS, fonts, images (maximum speed!)
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Serve from cache immediately
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(response => {
          // Only cache valid responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Cache for future use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache).catch(err => {
              console.log('[ServiceWorker] Failed to cache:', err);
            });
          });

          return response;
        });
      }).catch(() => {
        // Offline fallback
        return new Response('Offline', { status: 503 });
      })
  );
});

// Message event - handle skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - INSTANT takeover and cleanup
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating new version - INSTANT takeover!');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    // Clean up old caches immediately
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] New version active and controlling all pages!');
      // Take control of all pages IMMEDIATELY
      return self.clients.claim();
    })
  );
});
