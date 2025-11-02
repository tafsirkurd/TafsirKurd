const CACHE_NAME = 'tafsir-kurd-v10-optimized';
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
  '/data/quran.json',
  '/data/kurdish_tafsir.json',
  '/styles/Style.css',
  '/assets/fonts/fonts.css',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-regular.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-300.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-500.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-600.woff2',
  '/assets/fonts/ibm-plex-arabic-v11-latin_arabic-700.woff2',
  '/assets/fonts/amiri-quran-v1-arabic-regular.woff2',
  '/assets/fonts/SurahName.ttf',
  '/assets/fontawesome/all.min.css',
  '/assets/images/logo.png',
  '/manifest.json'
];

// Install event - cache resources aggressively
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing v10-optimized - aggressive caching enabled');
  event.waitUntil(
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
      return caches.open(CACHE_NAME);
    }).then(cache => {
      console.log('[ServiceWorker] Caching all resources for offline support');
      return cache.addAll(urlsToCache.map(url => {
        return new Request(url, { cache: 'reload' });
      })).catch(error => {
        console.error('[ServiceWorker] Failed to cache some resources:', error);
        // Continue even if some resources fail
      });
    })
  );
  self.skipWaiting();
});

// Fetch event - Cache First strategy for maximum speed
self.addEventListener('fetch', event => {
  // Skip service worker for API requests
  if (event.request.url.includes('googleapis.com') ||
      event.request.url.includes('accounts.google.com') ||
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('netlify/functions')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - serve immediately for instant performance
        if (response) {
          // Update cache in background for HTML pages
          if (event.request.mode === 'navigate') {
            fetch(event.request).then(freshResponse => {
              if (freshResponse && freshResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, freshResponse);
                });
              }
            }).catch(() => {});
          }
          return response;
        }

        // No cache - fetch from network
        return fetch(event.request).then(response => {
          // Only cache valid responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Cache for future offline use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      }).catch(() => {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/Quran.html');
        }
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

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
