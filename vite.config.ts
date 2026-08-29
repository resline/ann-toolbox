/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function offlineAssetManifest(): Plugin {
  return {
    name: 'offline-asset-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.values(bundle)
        .map((output) => '/' + output.fileName)
        .filter((fileName) => fileName.startsWith('/assets/'))
        .sort();
      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify({ schemaVersion: 1, assets }, null, 2) + '\n',
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineAssetManifest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
  },
});
