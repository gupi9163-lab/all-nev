const CACHE_VERSION = '3.2.0';
const CACHE_NAME = `hesablayici-v${CACHE_VERSION}`;

// Əsas fayllar - mütləq cache edilməli
const CORE_ASSETS = [
  '/',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Install event - bütün faylları cache et
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching all assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete, activating immediately');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Installation failed:', err);
      })
  );
});

// Activate event - köhnə cache-ləri sil və dərhal aktivləş
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Köhnə cache-ləri sil
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Dərhal bütün səhifələrə nəzarət et
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service Worker activated and ready');
    })
  );
});

// Fetch event - Cache First strategiyası (offline üçün ən yaxşısı)
self.addEventListener('fetch', event => {
  // Yalnız GET sorğularını cache et
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Əgər cache-də varsa, dərhal qaytar
        if (cachedResponse) {
          // Arxa planda yeniləməyə çalış
          fetch(event.request)
            .then(response => {
              if (response && response.status === 200 && response.type === 'basic') {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, response.clone());
                });
              }
            })
            .catch(() => {
              // Şəbəkə xətası, amma cache var
            });
          
          return cachedResponse;
        }

        // Cache-də yoxdur, şəbəkədən gətir
        return fetch(event.request)
          .then(response => {
            // Düzgün cavab yoxla
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache-ə əlavə et
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // Şəbəkə xətası və cache-də yoxdur
            // Əgər HTML səhifə sorğusudursa, index.html qaytar
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background Sync (gələcək üçün)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
});

// Push Notification (gələcək üçün)
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
});

// Message handler - force update
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting');
    self.skipWaiting();
  }
});
