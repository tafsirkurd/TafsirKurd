const CACHE_NAME = 'tafsir-kurd-v429-repeat-to-menu';
const urlsToCache = [
  '/',
  '/index.html',
  '/Quran.html',
  '/bookmarks.html',
  '/profile.html',
  '/goals.html',
  '/reading-goal.html',
  '/settings.html',
  '/login.html',
  '/onboarding.html',
  '/complete-signup.html',
  '/privacy-policy.html',
  '/terms-and-conditions.html',
  // Skip admin.html - too large (614KB), rarely needed offline
  '/data/quran.json',
  '/data/kurdish_tafsir.json',
  '/styles/mobile-optimize.css',
  '/utils/console-cleaner.js',
  '/utils/kurdish-numbers.js',
  '/utils/auto-kurdish-numbers.js',
  '/utils/notification-messages.js',
  '/utils/notification-scheduler.js',
  '/utils/theme-loader.js',
  '/utils/footer-loader.js',
  '/utils/bot-detector.js',
  '/utils/text-highlighter.js',
  '/assets/fonts/fonts.css',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-regular.woff2',
  // Skip weight-300 and 500 - not critical, load on demand
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-600.woff2',
  // Skip weight-700 - can fallback to 600 if needed
  '/assets/fonts/hafs.woff2',
  '/assets/fonts/amiri-quran-v1-arabic-regular.woff2',
  // Skip surah-name font - decorative, can lazy load on demand
  '/assets/fontawesome/all.min.css',
  '/assets/fontawesome/webfonts/fa-solid-900.woff2',
  '/assets/fontawesome/webfonts/fa-regular-400.woff2',
  '/assets/fontawesome/webfonts/fa-brands-400.woff2',
  '/assets/images/logo.png',
  '/assets/images/TafsirKurd.png',
  '/manifest.json'
];

// Install event - FAST cache installation with immediate activation
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing v429-repeat-to-menu');
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
      console.log('[ServiceWorker] Caching resources');
      // Cache files individually for better error handling
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(error => {
            console.warn('[ServiceWorker] Failed to cache:', url, error);
          });
        })
      );
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
      fetch(event.request)
        .then(response => {
          // Cache the fresh HTML for offline use (only GET requests)
          if (response && response.status === 200 && event.request.method === 'GET') {
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
