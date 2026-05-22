import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const removeLegacyPwaCaches = async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const hadController = Boolean(navigator.serviceWorker.controller);

    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if (hadController && !sessionStorage.getItem('legacy-pwa-cleared')) {
      sessionStorage.setItem('legacy-pwa-cleared', 'true');
      window.location.reload();
    }
  } catch (error) {
    console.warn('Failed to clear legacy PWA cache', error);
  }
};

removeLegacyPwaCaches();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
