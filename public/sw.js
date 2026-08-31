// TRAIT Service Worker — Push Notifications + Auto Update
const CACHE_NAME = 'trait-cache-v1';
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

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    const client = event.source;
    if (client) {
      client.postMessage({ type: 'SW_VERSION', version: '1.0' });
    }
  }
});

// Periodic version check (every 30 minutes when active)
let lastVersionCheck = 0;
self.addEventListener('fetch', (event) => {
  const now = Date.now();
  if (now - lastVersionCheck > 30 * 60 * 1000) {
    lastVersionCheck = now;
    event.waitUntil(
      fetch(VERSION_CHECK_URL + '?t=' + now, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.version) {
            self.clients.matchAll({ type: 'window' }).then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  type: 'SW_UPDATE_AVAILABLE',
                  version: data.version,
                });
              });
            });
          }
        })
        .catch(() => {})
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'TRAIT', body: event.data ? event.data.text() : 'Nouvelle notification' };
  }

  const title = data.title || 'TRAIT';
  const options = {
    body: data.body || '',
    icon: data.icon || '/trait-logo.png',
    badge: '/trait-logo.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
