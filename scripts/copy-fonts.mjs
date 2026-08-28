/**
 * Kopiuje pliki Inter Variable z @fontsource-variable/inter do public/fonts/.
 *
 * Fonty leżą w public/ pod stałą nazwą (nie są importowane przez Vite),
 * bo hashowana nazwa uniemożliwiłaby zarówno <link rel="preload">, jak i
 * precache w service workerze.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'node_modules/@fontsource-variable/inter/files');
const DEST = path.join(ROOT, 'public/fonts');

const FILES = {
  'inter-latin-wght-normal.woff2': 'inter-latin.woff2',
  'inter-latin-ext-wght-normal.woff2': 'inter-latin-ext.woff2',
};

fs.mkdirSync(DEST, { recursive: true });
for (const [from, to] of Object.entries(FILES)) {
  fs.copyFileSync(path.join(SRC, from), path.join(DEST, to));
  const kb = (fs.statSync(path.join(DEST, to)).size / 1024).toFixed(1);
  console.log(`✓ ${to} (${kb} kB)`);
}
