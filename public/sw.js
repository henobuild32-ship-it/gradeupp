// TRAIT Service Worker — Push Notifications + Auto Update
const CACHE_NAME = 'trait-v2';
const VERSION_CHECK_URL = '/api/app/version';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'CACHE_CLEARED' }));
      });
    });
  }
});

// Version check on every navigation
let lastCheck = 0;
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for HTML navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets with version check
  const now = Date.now();
  if (now - lastCheck > 10 * 60 * 1000) {
    lastCheck = now;
    event.waitUntil(
      fetch(VERSION_CHECK_URL + '?t=' + now, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.deployId) {
            const storedId = 'unknown';
            self.clients.matchAll({ type: 'window' }).then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  type: 'SW_UPDATE_AVAILABLE',
                  version: data.version,
                  deployId: data.deployId,
                });
              });
            });
          }
        })
        .catch(() => {})
    );
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'TRAIT', body: event.data?.text() || '' };
  }

  const title = data.title || 'TRAIT';
  const options = {
    body: data.body || data.message || '',
    icon: '/trait-logo.png',
    badge: '/trait-logo.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'trait-notification',
    renotify: true,
    data: { url: data.url || '/', ...data },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      self.clients.openWindow(url);
    })
  );
});
