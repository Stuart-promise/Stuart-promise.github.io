// Retire the previous offline course when an installed copy next connects.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const scope = self.registration.scope;
    const obsolete = (await caches.keys()).filter(name => name === 'pet234-spanish-course-shared-v1' ||
      (name.startsWith('pet234-spanish-course-') && name.endsWith(scope)));
    await Promise.all(obsolete.map(name => caches.delete(name)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({type: 'window'});
    await self.registration.unregister();
    const next = new URL('../#path', scope).href;
    await Promise.allSettled(windows.filter(client => client.url.startsWith(scope)).map(client => client.navigate(next)));
  })());
});
