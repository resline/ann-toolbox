/**
 * Generuje src/design/tokens.css z src/design/tokens.ts.
 * Uruchamiać po każdej zmianie wartości tokenów:  node scripts/build-tokens.mjs
 * Rozjazd między plikami wyłapuje src/design/tokens.test.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = path.join(ROOT, 'node_modules', '.cache', 'tokens.mjs');

fs.mkdirSync(path.dirname(TMP), { recursive: true });
await build({
  entryPoints: [path.join(ROOT, 'src/design/tokens.ts')],
  outfile: TMP,
  format: 'esm',
  bundle: true,
  logLevel: 'silent',
});

const { COLOR_TOKENS, SIZE_TOKENS, THEME_IDS, THEME_IS_DARK } = await import(
  `file://${TMP}?t=${Date.now()}`
);

/** '#F6F4EF' -> '246 244 239' (format kanałowy pod rgb(var(--x) / <alpha-value>)) */
const channels = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const SHADOWS = {
  day: {
    lift: '0 1px 2px rgb(35 33 29 / 0.04), 0 4px 12px -4px rgb(35 33 29 / 0.10)',
    sheet: '0 -2px 8px rgb(35 33 29 / 0.04), 0 -12px 40px -8px rgb(35 33 29 / 0.14)',
  },
  dusk: {
    lift: '0 1px 2px rgb(0 0 0 / 0.40), 0 4px 12px -4px rgb(0 0 0 / 0.50)',
    sheet: '0 -2px 8px rgb(0 0 0 / 0.40), 0 -12px 40px -8px rgb(0 0 0 / 0.60)',
  },
  oled: {
    lift: '0 1px 2px rgb(0 0 0 / 0.60), 0 4px 12px -4px rgb(0 0 0 / 0.70)',
    sheet: '0 -2px 8px rgb(0 0 0 / 0.60), 0 -12px 40px -8px rgb(0 0 0 / 0.80)',
  },
};

const themeBlock = (theme, selector) => {
  const lines = [
    `  color-scheme: ${THEME_IS_DARK[theme] ? 'dark' : 'light'};`,
    ...Object.entries(COLOR_TOKENS).map(
      ([name, byTheme]) => `  --${name}: ${channels(byTheme[theme])};`
    ),
    `  --shadow-hairline: 0 0 0 1px rgb(var(--line));`,
    `  --shadow-lift: ${SHADOWS[theme].lift};`,
    `  --shadow-sheet: ${SHADOWS[theme].sheet};`,
  ];
  return `${selector} {\n${lines.join('\n')}\n}`;
};

const MODULES = ['czas', 'skupienie', 'energia', 'start'];
const MODULE_SOURCE = { czas: 'time', skupienie: 'focus', energia: 'energy', start: 'start' };

const css = `/* PLIK GENEROWANY — nie edytuj ręcznie.
   Źródło: src/design/tokens.ts   Generator: scripts/build-tokens.mjs
   Po zmianie wartości uruchom: node scripts/build-tokens.mjs */

${themeBlock('day', ":root,\n[data-theme='day']")}

${themeBlock('dusk', "[data-theme='dusk']")}

${themeBlock('oled', "[data-theme='oled']")}

/* Wymiary — wspólne dla wszystkich motywów */
:root {
${Object.entries(SIZE_TOKENS).map(([n, v]) => `  --${n}: ${v};`).join('\n')}
}

/* Alias akcentu modułu. Prymitywy czytają --module i kolorują się same;
   fallback na --accent jest obowiązkowy, inaczej poza modułem renderują się
   przezroczysto. */
:root {
  --module: var(--accent);
  --module-soft: var(--accent-soft);
  --module-ink: var(--accent-ink);
}
${MODULES.map((m) => {
  const s = MODULE_SOURCE[m];
  return `[data-module='${m}'] {\n  --module: var(--m-${s});\n  --module-soft: var(--m-${s}-soft);\n  --module-ink: var(--m-${s}-ink);\n}`;
}).join('\n')}

/* Ograniczenie ruchu. Framer degraduje własne drzewo przez MotionConfig,
   ale przejścia Tailwinda przez nie nie przechodzą — stąd ta warstwa. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
html[data-motion='reduced'] *,
html[data-motion='reduced'] *::before,
html[data-motion='reduced'] *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
`;

fs.writeFileSync(path.join(ROOT, 'src/design/tokens.css'), css);
console.log(
  `✓ tokens.css — ${Object.keys(COLOR_TOKENS).length} tokenów kolorystycznych × ${THEME_IDS.length} motywy, ${Object.keys(SIZE_TOKENS).length} wymiarowych`
);
