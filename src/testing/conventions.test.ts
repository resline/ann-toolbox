import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Strażnik konwencji testów.
 *
 * Zakaz działa tylko wtedy, gdy jest sprawdzalny. Każdy z poniższych wzorców
 * wziął się z konkretnego testu, który pękał przy zmianie wyglądu:
 * asercja na klasie Tailwinda przy zmianie akcentu, selektor po wewnętrznej
 * klasie SVG, kolejność w DOM jako kontrakt, literał interfejsu jako selektor.
 */

const SRC = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Ten plik czyta cudze testy, więc siebie musi pominąć. */
const TEST_FILES = walk(SRC).filter((f) => !f.endsWith('conventions.test.ts'));

/** Testy warstwy copy z założenia operują na napisach — to ich przedmiot. */
const COPY_LAYER = /src[\\/](copy|design)[\\/]/;

interface Violation {
  file: string;
  line: number;
  text: string;
}

function scan(pattern: RegExp, skip: (file: string) => boolean = () => false): Violation[] {
  const found: Violation[] = [];
  for (const file of TEST_FILES) {
    if (skip(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, index) => {
      // pomiń komentarze — zakazany wzorzec bywa cytowany w wyjaśnieniu
      if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
      if (pattern.test(text)) {
        found.push({ file: path.relative(SRC, file), line: index + 1, text: text.trim() });
      }
    });
  }
  return found;
}

const report = (v: Violation[]) => v.map((x) => `${x.file}:${x.line}  ${x.text}`).join('\n');

describe('konwencja testów', () => {
  it('żaden test nie asertuje na klasach CSS', () => {
    // pękało przy zmianie koloru aktywnej pozycji nawigacji
    const found = scan(/\.className\)?\s*(\)\s*)?\.(toContain|toMatch|toBe)\b|toHaveClass\(/);
    expect(found, `Asercja na klasie CSS:\n${report(found)}`).toEqual([]);
  });

  it('żaden test nie wybiera elementów po wewnętrznych klasach', () => {
    // pękało przy przepisaniu tarczy SVG — 21 asercji na .time-timer-*
    const found = scan(/(container|element|el)\.querySelector(All)?\(\s*['"`]\./);
    expect(found, `Selektor po klasie CSS:\n${report(found)}`).toEqual([]);
  });

  it('żaden test nie używa placeholdera jako selektora', () => {
    const found = scan(/getByPlaceholderText|findByPlaceholderText|queryByPlaceholderText/);
    expect(found, `Placeholder to element wizualny, nie kontrakt:\n${report(found)}`).toEqual([]);
  });

  it('żaden test nie traktuje kolejności w DOM jako kontraktu', () => {
    // pękało przy przestawieniu kart w siatce
    const found = scan(/getAllBy\w+\([^)]*\)\s*\[\s*[0-9]+\s*\]/);
    expect(found, `Kolejność w DOM jako kontrakt:\n${report(found)}`).toEqual([]);
  });

  it('żaden test widoku nie używa polskiego literału jako selektora', () => {
    // Testy widoku i warstwa copy to dwie warstwy BEZ wspólnych asercji.
    // Gdyby test widoku sięgał po napis, przechodziłby też dla wersji angielskiej.
    const found = scan(
      /(getBy|findBy|queryBy|getAllBy|findAllBy|queryAllBy)\w*\([^)]*['"`/][^'"`)]*[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/,
      (file) => COPY_LAYER.test(file)
    );
    expect(found, `Literał interfejsu jako selektor:\n${report(found)}`).toEqual([]);
  });

  it('żaden test nie używa emoji w selektorze', () => {
    const found = scan(
      /(getBy|findBy|queryBy|getAllBy)\w*\([^)]*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    );
    expect(found, `Emoji w selektorze:\n${report(found)}`).toEqual([]);
  });

  it('są jakieś testy do sprawdzenia', () => {
    // zabezpieczenie przed cichym przejściem, gdyby zmieniła się struktura katalogów
    expect(TEST_FILES.length).toBeGreaterThan(15);
  });
});
