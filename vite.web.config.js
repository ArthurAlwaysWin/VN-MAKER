/**
 * vite.web.config.js — Standalone web build configuration.
 *
 * Builds only the runtime engine (index.html → src/main.js) into
 * deterministic engine.js + engine.css output files for web export.
 *
 * Usage: npx vite build --config vite.web.config.js
 * Or:    npm run build:web
 *
 * Per D-03: Independent from vite.config.js (no Electron plugins).
 * Per D-04: Deterministic filenames (no content hash).
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'engine.js',
        chunkFileNames: 'engine-[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'engine.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
