import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Capacitor requires an absolute base URL for assets
  base: '/',
  build: {
    outDir: 'dist',
  },
  define: {
    // Expose env vars prefixed with VITE_ to the client bundle
    'process.env': {},
  },
});
