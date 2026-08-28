import { describe, it, expect } from 'vitest';
import { allCopy, modules } from './index';

/**
 * Druga warstwa testów: sprawdza, czy teksty są DOBRZE NAPISANE.
 *
 * Testy widoków celowo nie importują `copy` — gdyby importowały, przechodziłyby
 * także wtedy, gdy napis jest po angielsku. Tutaj jest odwrotnie: żadnego DOM-u,
 * same asercje na danych, więc ten plik przeżywa każdy redesign.
 */

type Entry = [path: string, value: string];

function flatten(obj: unknown, prefix = ''): Entry[] {
  if (typeof obj === 'string') return [[prefix, obj]];
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

const entries = flatten(allCopy);

describe('copy — brak angielszczyzny', () => {
  /** Napisy, które faktycznie siedziały w produkcyjnym interfejsie. */
  const BANNED = [
    'Visual Timer', 'Focus Mode', 'Zen Focus', 'Dopamine Roulette',
    'Add New Activity', 'Activity Name', 'Save Activity', 'Energy Required',
    'Overall Progress', 'Start Another Task', 'Close modal', 'View All',
    'Description (Optional)',
  ];

  it('nie zawiera żadnego z napisów, które usuwamy', () => {
    const found = entries.filter(([, v]) => BANNED.some((b) => v.includes(b)));
    expect(found, found.map(([p, v]) => `${p}: "${v}"`).join('\n')).toEqual([]);
  });

  it('nie zawiera samotnych angielskich słów sterujących', () => {
    // „Start" i „Pauza" celowo poza listą: to zadomowione polskie słowa,
    // a „Start" jest wybraną nazwą modułu.
    const LONE = /^(Save|Cancel|Close|Reset|Add|Edit|Delete|Volume|Breathe|Timer|Focus|Done|Next|Back|Settings|More|Resume|Stop)$/i;
    const found = entries.filter(([, v]) => LONE.test(v.trim()));
    expect(found, found.map(([p, v]) => `${p}: "${v}"`).join('\n')).toEqual([]);
  });

  it('nie zawiera surowych wartości enumów', () => {
    const RAW = /^(low|medium|high|short-break|long-break|idle|running|paused)$/;
    const found = entries.filter(([, v]) => RAW.test(v.trim()));
    expect(found, found.map(([p, v]) => `${p}: "${v}"`).join('\n')).toEqual([]);
  });
});

describe('copy — spójność', () => {
  it('jedna akcja ma jedno brzmienie', () => {
    const actions = Object.values(allCopy.common.action);
    expect(new Set(actions).size, 'zduplikowane brzmienia akcji').toBe(actions.length);
  });

  it('nazwy modułów są stanowe i w ustalonej kolejności', () => {
    expect([
      modules.czas.title,
      modules.skupienie.title,
      modules.energia.title,
      modules.start.title,
    ]).toEqual(['Czas', 'Skupienie', 'Energia', 'Start']);
  });

  it('każdy moduł mówi, kiedy się po niego sięga', () => {
    for (const [key, mod] of Object.entries(modules)) {
      expect(mod.purpose.length, `${key}.purpose`).toBeGreaterThan(10);
    }
  });

  it('żaden napis nie jest pusty ani nie ma zbędnych spacji', () => {
    for (const [path, value] of entries) {
      expect(value.length, path).toBeGreaterThan(0);
      expect(value, path).toBe(value.trim());
    }
  });
});

describe('copy — rodzaj żeński', () => {
  it('nie zwraca się do użytkowniczki w rodzaju męskim', () => {
    // aplikacja jest pisana dla konkretnej osoby i mówi do niej „zebrałaś",
    // nie „zebrałeś" — ta asercja pilnuje, żeby to się nie rozjechało
    const MASCULINE = /\b\w+(łeś|eś gotowy|byłeś|zrobiłeś|możesz być pewien)\b/i;
    const found = entries.filter(([, v]) => MASCULINE.test(v));
    expect(found, found.map(([p, v]) => `${p}: "${v}"`).join('\n')).toEqual([]);
  });
});

describe('copy — polszczyzna', () => {
  it('używa polskich znaków diakrytycznych, a nie zamienników ASCII', () => {
    // typowe podmianki: "zebralas" zamiast "zebrałaś", "wiecej" zamiast "więcej"
    const SUSPECT = /\b(wiecej|zamknij sie|blad|prosze|nastepny|poczatek|skonczone|zaczac|wlacz|wylacz)\b/i;
    const found = entries.filter(([, v]) => SUSPECT.test(v));
    expect(found, found.map(([p, v]) => `${p}: "${v}"`).join('\n')).toEqual([]);
  });
});
