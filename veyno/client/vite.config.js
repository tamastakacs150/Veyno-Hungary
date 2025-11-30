import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5555',
        changeOrigin: true,
      }
    },
    fs: {
      allow: [
        '..',
        path.resolve(__dirname, 'node_modules/slick-carousel/slick/fonts')
      ]
    }
  },
  build: {
    sourcemap: true,
    minify: 'esbuild',
  }
})
