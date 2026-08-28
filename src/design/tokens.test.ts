import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  COLOR_TOKENS,
  SIZE_TOKENS,
  THEME_IDS,
  type ThemeId,
  type ColorTokenName,
} from './tokens';

const CSS = fs.readFileSync(path.resolve(__dirname, 'tokens.css'), 'utf8');

/** Wyciąga mapę token -> "r g b" z bloku danego motywu. */
function tokensFromCss(theme: ThemeId): Record<string, string> {
  const selector =
    theme === 'day' ? String.raw`:root,\s*\[data-theme='day'\]` : String.raw`\[data-theme='${theme}'\]`;
  const block = new RegExp(`${selector}\\s*\\{([^}]*)\\}`).exec(CSS);
  if (!block) throw new Error(`Brak bloku motywu ${theme} w tokens.css`);
  const out: Record<string, string> = {};
  for (const m of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

const hexToChannels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/** Relatywna luminancja wg WCAG 2.1 */
function luminance(hex: string): number {
  const [r, g, b] = hexToChannels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const c = (name: ColorTokenName, theme: ThemeId) => COLOR_TOKENS[name][theme];

describe('tokens — parytet CSS ↔ TS', () => {
  it.each(THEME_IDS)('motyw %s zawiera każdy token z tokens.ts', (theme) => {
    const fromCss = tokensFromCss(theme);
    const missing = Object.keys(COLOR_TOKENS).filter((n) => !(n in fromCss));
    expect(missing, `brakuje w tokens.css: ${missing.join(', ')}`).toEqual([]);
  });

  it.each(THEME_IDS)('motyw %s ma wartości zgodne z tokens.ts', (theme) => {
    const fromCss = tokensFromCss(theme);
    const mismatched: string[] = [];
    for (const [name, byTheme] of Object.entries(COLOR_TOKENS)) {
      const expected = hexToChannels(byTheme[theme as ThemeId]).join(' ');
      if (fromCss[name] !== expected) {
        mismatched.push(`${name}: css=${fromCss[name]} ts=${expected}`);
      }
    }
    expect(mismatched, mismatched.join('\n')).toEqual([]);
  });

  it('tokeny wymiarowe są w tokens.css', () => {
    for (const [name, value] of Object.entries(SIZE_TOKENS)) {
      expect(CSS, `--${name}`).toContain(`--${name}: ${value};`);
    }
  });

  it('alias --module ma fallback na --accent w :root', () => {
    expect(CSS).toMatch(/:root\s*\{[^}]*--module:\s*var\(--accent\);/);
  });

  it('każdy moduł ustawia komplet aliasów', () => {
    for (const m of ['czas', 'skupienie', 'energia', 'start']) {
      const block = new RegExp(`\\[data-module='${m}'\\]\\s*\\{([^}]*)\\}`).exec(CSS);
      expect(block, `brak bloku [data-module='${m}']`).not.toBeNull();
      for (const alias of ['--module', '--module-soft', '--module-ink']) {
        expect(block![1]).toContain(`${alias}:`);
      }
    }
  });

  it('obsługa prefers-reduced-motion jest obecna', () => {
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce)');
    expect(CSS).toContain("html[data-motion='reduced']");
  });
});

describe('tokens — kontrast WCAG', () => {
  const AA_TEXT = 4.5;
  const AA_NON_TEXT = 3;

  it.each(THEME_IDS)('%s: trzy stopnie tekstu przechodzą AA na surface', (theme) => {
    for (const ink of ['ink', 'ink-muted', 'ink-faint'] as const) {
      const ratio = contrast(c(ink, theme), c('surface', theme));
      expect(ratio, `${theme} ${ink} na surface = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(THEME_IDS)('%s: tekst przechodzi AA także na canvas i surface-raised', (theme) => {
    for (const bg of ['canvas', 'surface-raised', 'surface-sunken'] as const) {
      for (const ink of ['ink', 'ink-muted', 'ink-faint'] as const) {
        const ratio = contrast(c(ink, theme), c(bg, theme));
        expect(ratio, `${theme} ${ink} na ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it.each(THEME_IDS)('%s: akcent czytelny na swoim tle miękkim i odwrotnie', (theme) => {
    const soft = contrast(c('accent-ink', theme), c('accent-soft', theme));
    expect(soft, `${theme} accent-ink na accent-soft = ${soft.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);

    const solid = contrast(c('accent-contrast', theme), c('accent', theme));
    expect(solid, `${theme} accent-contrast na accent = ${solid.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(THEME_IDS)('%s: kolory semantyczne czytelne na swoich tłach', (theme) => {
    for (const fam of ['positive', 'caution', 'attention'] as const) {
      const ratio = contrast(c(`${fam}-ink`, theme), c(`${fam}-soft`, theme));
      expect(ratio, `${theme} ${fam}-ink na ${fam}-soft = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(THEME_IDS)('%s: akcenty modułów czytelne na swoich tłach miękkich', (theme) => {
    for (const m of ['m-time', 'm-focus', 'm-energy', 'm-start'] as const) {
      const ratio = contrast(c(`${m}-ink`, theme), c(`${m}-soft`, theme));
      expect(ratio, `${theme} ${m}-ink na ${m}-soft = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(THEME_IDS)('%s: tekst canvas czytelny na solidnym akcencie i akcentach modułów', (theme) => {
    // Button variant="primary" renderuje `text-canvas` na `bg-accent`/`bg-module`.
    // Canvas jest jasny w motywie dziennym i ciemny w nocnych, więc kontrast
    // dopasowuje się sam — ale tylko dopóki ta asercja tego pilnuje.
    for (const solid of ['accent', 'm-time', 'm-focus', 'm-energy', 'm-start'] as const) {
      const ratio = contrast(c('canvas', theme), c(solid, theme));
      expect(ratio, `${theme} canvas na ${solid} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(THEME_IDS)('%s: focus ring ma ≥3:1 na surface i na accent-soft', (theme) => {
    for (const bg of ['surface', 'accent-soft'] as const) {
      const ratio = contrast(c('focus-ring', theme), c(bg, theme));
      expect(ratio, `${theme} focus-ring na ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
  });

  it.each(THEME_IDS)('%s: obrys ma ≥3:1 na surface (element nietekstowy)', (theme) => {
    const ratio = contrast(c('line-strong', theme), c('surface', theme));
    expect(ratio, `${theme} line-strong na surface = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it.each(THEME_IDS)('%s: trzy motywy faktycznie się różnią', (theme) => {
    const others = THEME_IDS.filter((t) => t !== theme);
    for (const other of others) {
      expect(c('surface', theme), `surface ${theme} vs ${other}`).not.toBe(c('surface', other));
    }
  });
});
