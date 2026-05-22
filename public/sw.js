self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'reload' }));
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      await self.registration.unregister();

      await Promise.all(
        clients.map((client) => {
          if ('navigate' in client) {
            const url = new URL(client.url);
            if (!url.searchParams.has('sw-cleared')) {
              url.searchParams.set('sw-cleared', String(Date.now()));
            }
            return client.navigate(url.toString());
          }
          return Promise.resolve();
        }),
      );
    })(),
  );
});
