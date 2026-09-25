// TRAIT Service Worker — Push Notifications + offline shell
// v11 : iOS-safe — jamais de Response.error() sur une navigation,
// cache-first pour les chunks immuables /_next/static/.
const CACHE_NAME = 'trait-v11';

const OFFLINE_HTML =
  '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>TRAIT</title><style>' +
  'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
  'font-family:system-ui,-apple-system,sans-serif;background:#0D5C63;color:#fff}' +
  '.c{text-align:center;padding:24px;max-width:420px}' +
  'h1{font-size:1.15rem;margin:0 0 8px}' +
  'p{opacity:.9;font-size:.95rem;line-height:1.5;margin:0 0 18px}' +
  'button{padding:12px 26px;border:0;border-radius:10px;background:#fff;color:#0D5C63;' +
  'font-size:1rem;font-weight:600;cursor:pointer}' +
  '</style></head><body><div class="c">' +
  '<h1>Vous êtes hors connexion</h1>' +
  '<p>Vérifiez votre connexion internet puis réessayez.</p>' +
  '<button onclick="location.reload()">Réessayer</button>' +
  '</div></body></html>';

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
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
  if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'SW_UPDATE_AVAILABLE' }));
    });
  }
});

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations : network-first, puis cache, puis page hors-ligne (jamais Response.error())
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || offlineResponse())
        )
    );
    return;
  }

  // API : toujours le réseau (aucune mise en cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Chunks immuables Next.js : cache-first (identifiants par hash, invariants après déploiement)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const cloned = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => {});
            }
            return response;
          })
          .catch(() => Response.error());
      })
    );
    return;
  }

  // Autres JS/CSS : network-first puis cache
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || Response.error()))
    );
    return;
  }

  // Images/fonts/icons : cache-first puis réseau
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => {});
          }
          return response;
        })
        .catch(() => Response.error());
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

  event.waitUntil(
    self.registration.showNotification(data.title || 'TRAIT', {
      body: data.body || data.message || '',
      icon: '/trait-logo.png',
      badge: '/trait-logo.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'trait-notification',
      renotify: true,
      data: { url: data.url || '/', ...data },
      actions: data.actions || [],
    })
  );
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
