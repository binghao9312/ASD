(async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if (!sessionStorage.getItem('legacy-register-sw-cleared')) {
      sessionStorage.setItem('legacy-register-sw-cleared', 'true');
      const url = new URL(window.location.href);
      url.searchParams.set('sw-cleared', String(Date.now()));
      window.location.replace(url.toString());
    }
  } catch (error) {
    console.warn('Failed to clear legacy service worker', error);
  }
})();
