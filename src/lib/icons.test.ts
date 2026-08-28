import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Strażnik rozmiaru wysyłki.
 *
 * Barrel `lucide-react` re-eksportuje przestrzeń nazw wszystkich ikon
 * (`import * as index from './icons/index.js'`), przez co Rollup nie odrzuca
 * niczego i do bundla trafia komplet ~1500 ikon zamiast używanych 44.
 * Przejście na `src/lib/icons.ts` zmniejszyło wysyłkę z 308 kB do 167 kB gzip.
 *
 * Ten test pilnuje, żeby pojedynczy `import { X } from 'lucide-react'` tego
 * nie cofnął — bo skutek jest niewidoczny w kodzie i widoczny dopiero w buildzie.
 */

const SRC = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('import ikon', () => {
  it('żaden plik poza src/lib/icons.ts nie importuje wprost z lucide-react', () => {
    const offenders = walk(SRC)
      .filter((f) => !f.endsWith(path.join('lib', 'icons.ts')))
      .filter((f) => !f.endsWith('lucide-icons.d.ts'))
      // tylko realne instrukcje importu/eksportu, nie wzmianki w komentarzach
      .filter((f) =>
        /^\s*(import|export)\b[^;\n]*from ['"]lucide-react['"]/m.test(fs.readFileSync(f, 'utf8'))
      )
      .map((f) => path.relative(SRC, f));

    expect(
      offenders,
      `Importuj z src/lib/icons.ts zamiast z 'lucide-react':\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('src/lib/icons.ts używa wyłącznie importów pojedynczych ikon', () => {
    const source = fs.readFileSync(path.join(SRC, 'lib', 'icons.ts'), 'utf8');
    // dozwolony jest jedynie re-eksport typu LucideIcon z barrela
    const barrelImports = [
      ...source.matchAll(/^\s*(?:import|export)\b[^;\n]*from ['"]lucide-react['"]/gm),
    ];
    expect(barrelImports.length, 'tylko export type { LucideIcon }').toBeLessThanOrEqual(1);
    expect(source).toMatch(/export type \{ LucideIcon \} from 'lucide-react'/);
    expect(source).toMatch(/from 'lucide-react\/icons\//);
  });
});
