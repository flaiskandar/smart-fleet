import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __BACKEND_URL__: JSON.stringify(
      process.env.VITE_API_URL || 'https://linux-bookmarks-pure-taxi.trycloudflare.com'
    ),
  },
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/v1': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
      '/docs': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
