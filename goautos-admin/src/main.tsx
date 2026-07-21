import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/i18n';
import { installGlobalErrorHandlers } from './lib/globalErrorHandlers';

// Catch global: promesas rechazadas / errores sueltos → un solo toast en español.
installGlobalErrorHandlers();

// Service worker cleanup — bump version to force fresh cache for all users
if ('serviceWorker' in navigator) {
  const SW_CLEANUP_KEY = 'sw-cleanup-v3';
  if (!localStorage.getItem(SW_CLEANUP_KEY)) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
      localStorage.setItem(SW_CLEANUP_KEY, '1');
      if (registrations.length > 0) {
        window.location.reload();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
