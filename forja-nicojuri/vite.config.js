import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Forja — Herramientas Nicojuri',
        short_name: 'Forja',
        description: 'Forja — Suite de herramientas empresariales de Nicojuri',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#050b18',
        theme_color: '#050b18',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // OJO: sin 'html'. No precacheamos index.html a propósito: si lo
        // precacheáramos, la PWA serviría el shell viejo desde caché y al abrir
        // mostraría un build anterior (con menos apps). Los assets JS/CSS llevan
        // hash en el nombre, así que sí es seguro precachearlos (inmutables).
        globPatterns: ['**/*.{js,css,svg,png,ico}'],
        // Desactiva el NavigationRoute por defecto (que serviría el index.html
        // precacheado). La navegación la maneja la regla NetworkFirst de abajo.
        navigateFallback: null,
        // Nueva versión toma control de inmediato y limpia cachés viejas.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // El documento (navegación): SIEMPRE desde la red cuando hay
            // internet, así se ve siempre la última versión; sin conexión cae al
            // último HTML cacheado. Excluye /auth (callback de Supabase).
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' && !url.pathname.startsWith('/auth'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
