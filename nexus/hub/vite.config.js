import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El Hub se compila a dist/ y lo sirve server.js.
// En desarrollo, Vite proxea /api al servidor Node en :3000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
