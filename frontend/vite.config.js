/**
 * RAG from Scratch - Step 13 Vite development/test configuration.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ingest': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/query': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.js',
    globals: true,
    css: true,
  },
});
