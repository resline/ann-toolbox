import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Strażnik warstwy stylów.
 *
 * Punkt wyjścia tego redesignu: 672 warianty `dark:` w 35 plikach i cztery
 * zmienne CSS motywu, których nie używał żaden komponent. Skutkiem było to,
 * że motyw „Czerń OLED" renderował się identycznie jak „Ciepły Zmierzch",
 * a powierzchnie kart w trybie ciemnym były przezroczyste, bo `warmgray-850`
 * w ogóle nie istniało w konfiguracji.
 *
 * Ten test pilnuje, żeby żadna z tych dróg nie wróciła — skutek jest
 * niewidoczny w kodzie i widoczny dopiero na ekranie w konkretnym motywie.
 */

const SRC = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const FILES = walk(SRC).filter((f) => !f.endsWith('noLegacyStyles.test.ts'));

interface Hit {
  file: string;
  line: number;
  text: string;
}

function scan(pattern: RegExp, skip: (file: string) => boolean = () => false): Hit[] {
  const hits: Hit[] = [];
  for (const file of FILES) {
    if (skip(file)) continue;
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, index) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
        if (pattern.test(text)) {
          hits.push({ file: path.relative(SRC, file), line: index + 1, text: text.trim() });
        }
      });
  }
  return hits;
}

const report = (h: Hit[]) => h.map((x) => `${x.file}:${x.line}  ${x.text.slice(0, 120)}`).join('\n');

describe('warstwa stylów', () => {
  it('nie ma ani jednego wariantu dark:', () => {
    const hits = scan(/\bdark:/);
    expect(hits, `Motyw niesie [data-theme], nie klasę .dark:\n${report(hits)}`).toEqual([]);
  });

  it('nie ma klas ze skasowanych palet', () => {
    const hits = scan(
      /\b(bg|text|border|stroke|fill|ring|from|to|via|divide|outline|shadow|accent|caret|decoration|placeholder)-(sage|warmgray|calm)-/
    );
    expect(hits, `Palety sage/warmgray/calm zastąpiły tokeny:\n${report(hits)}`).toEqual([]);
  });

  it('nie ma kolorów Tailwinda użytych wprost w modułach', () => {
    // kolor niesie znaczenie tylko wtedy, gdy idzie przez token —
    // inaczej motyw wieczorny i nocny znów się rozjadą
    const hits = scan(
      /\b(bg|text|border|stroke|fill|ring)-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d{2,3})?\b/,
      (file) => !file.includes(`${path.sep}modules${path.sep}`) && !file.includes(`${path.sep}app${path.sep}`)
    );
    expect(hits, `Użyj tokenów zamiast palety Tailwinda:\n${report(hits)}`).toEqual([]);
  });

  it('nie ma grubości czcionki powyżej 600', () => {
    // hierarchia idzie rozmiarem i odstępem, nie grubością
    const hits = scan(/\bfont-(bold|extrabold|black)\b/);
    expect(hits, `Skala kończy się na font-semibold:\n${report(hits)}`).toEqual([]);
  });

  it('konfiguracja Tailwinda nie deklaruje już trybu ciemnego na klasie', () => {
    const config = fs.readFileSync(path.resolve(SRC, '..', 'tailwind.config.js'), 'utf8');
    expect(config).not.toMatch(/darkMode/);
    expect(config).not.toMatch(/\bsage:\s*\{/);
    expect(config).not.toMatch(/\bwarmgray:\s*\{/);
  });

  it('są jakieś pliki do sprawdzenia', () => {
    expect(FILES.length).toBeGreaterThan(50);
  });
});
