import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as dziennik from './journal';
import {
  JOURNAL_MAX_ENTRIES,
  JOURNAL_WINDOW_DAYS,
  appendJournalEntry,
  clearJournal,
  localDay,
  pruneEntries,
  readJournal,
  summarizeByDay,
  summarizeByModule,
  type JournalEntry,
} from './journal';
import { STORAGE_KEYS } from '../storage/persist';

/**
 * Poza zwykłym „zapisuje i odczytuje" ten plik pilnuje granicy produktowej:
 * dziennik ma nie mieć czym zawstydzić za przerwę. Asercja na kształt wpisu
 * i na listę eksportów jest tu po to, żeby seria dni albo punkty nie weszły
 * do tej warstwy przy okazji jakiejś późniejszej „drobnej" zmiany.
 */

const dzien = (iso: string) => new Date(iso);

/** Wpis wstawiony wprost do zapisu — bez przechodzenia przez append. */
function zapiszWprost(entries: JournalEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.slad, JSON.stringify({ version: 1, entries }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dziennik — łagodność', () => {
  it('wpis niesie wyłącznie fakty', () => {
    const wpis = appendJournalEntry({ module: 'czas', kind: 'ukonczone', minutes: 25, count: 1 });

    expect(wpis).not.toBeNull();
    expect(Object.keys(wpis as JournalEntry).sort()).toEqual([
      'at',
      'count',
      'id',
      'kind',
      'minutes',
      'module',
    ]);
  });

  it('nie eksportuje niczego, co liczyłoby serie, punkty ani poziomy', () => {
    const zakazane = Object.keys(dziennik).filter((nazwa) =>
      /streak|seria|serie|punkt|point|poziom|level|odznak|badge|score|combo/i.test(nazwa)
    );

    expect(zakazane, zakazane.join(', ')).toEqual([]);
  });

  it('zna tylko trzy rodzaje zdarzeń, wszystkie neutralne', () => {
    expect([...dziennik.JOURNAL_KINDS]).toEqual(['rozpoczete', 'ukonczone', 'odlozone']);
  });
});

describe('dziennik — zapis i odczyt', () => {
  it('dopisuje wpis i oddaje go przy odczycie', () => {
    appendJournalEntry({ module: 'skupienie', kind: 'rozpoczete' });

    const wpisy = readJournal();
    expect(wpisy).toHaveLength(1);
    expect(wpisy[0].module).toBe('skupienie');
    expect(wpisy[0].kind).toBe('rozpoczete');
    expect(Number.isNaN(Date.parse(wpisy[0].at))).toBe(false);
  });

  it('nadaje każdemu wpisowi osobny identyfikator', () => {
    appendJournalEntry({ module: 'energia', kind: 'ukonczone' });
    appendJournalEntry({ module: 'energia', kind: 'ukonczone' });

    const identyfikatory = readJournal().map((w) => w.id);
    expect(new Set(identyfikatory).size).toBe(2);
  });

  it('przyjmuje własny znacznik czasu', () => {
    appendJournalEntry(
      { module: 'czas', kind: 'ukonczone', at: dzien('2026-05-04T08:30:00.000Z') },
      dzien('2026-05-04T09:00:00.000Z')
    );

    expect(readJournal()[0].at).toBe('2026-05-04T08:30:00.000Z');
  });

  it('wpis wsteczny sprzed okna nie zostaje zapisany', () => {
    // spójne z przycinaniem: skoro taki wpis i tak wypadłby przy najbliższym
    // zapisie, nie ma po co udawać, że jest w dzienniku
    const teraz = dzien('2026-08-31T12:00:00.000Z');
    appendJournalEntry({ module: 'czas', kind: 'ukonczone', at: '2026-01-01T10:00:00.000Z' }, teraz);

    expect(readJournal()).toEqual([]);
  });

  it('odrzuca wpis z niemożliwą datą', () => {
    expect(appendJournalEntry({ module: 'czas', kind: 'ukonczone', at: 'wczoraj' })).toBeNull();
    expect(readJournal()).toEqual([]);
  });

  it('pomija liczby, które nie są liczbami', () => {
    const wpis = appendJournalEntry({
      module: 'start',
      kind: 'ukonczone',
      minutes: Number.NaN,
      count: -3,
    });

    expect(wpis?.minutes).toBeUndefined();
    expect(wpis?.count).toBeUndefined();
  });

  it('oddaje wpisy od najstarszego, niezależnie od kolejności zapisu', () => {
    zapiszWprost([
      { id: 'b', module: 'czas', kind: 'ukonczone', at: '2026-03-02T10:00:00.000Z' },
      { id: 'a', module: 'czas', kind: 'ukonczone', at: '2026-03-01T10:00:00.000Z' },
    ]);

    expect(readJournal().map((w) => w.id)).toEqual(['a', 'b']);
  });

  it('czyszczenie zostawia pusty dziennik', () => {
    appendJournalEntry({ module: 'czas', kind: 'ukonczone' });
    clearJournal();

    expect(readJournal()).toEqual([]);
  });
});

describe('dziennik — odporność', () => {
  it('uszkodzony JSON czyta się jak pusty dziennik', () => {
    localStorage.setItem(STORAGE_KEYS.slad, 'to nie jest json');

    expect(readJournal()).toEqual([]);
  });

  it('zapis o obcym kształcie czyta się jak pusty dziennik', () => {
    localStorage.setItem(STORAGE_KEYS.slad, JSON.stringify({ version: 1, entries: 'nic' }));

    expect(readJournal()).toEqual([]);
  });

  it('uszkodzony wpis wypada, reszta zostaje', () => {
    zapiszWprost([
      { id: 'ok', module: 'czas', kind: 'ukonczone', at: '2026-03-01T10:00:00.000Z' },
      { id: 'zly', module: 'nie-ma-takiego', kind: 'ukonczone', at: '2026-03-01T11:00:00.000Z' },
      { id: 'bez-daty', module: 'czas', kind: 'ukonczone', at: 'kiedyś' },
    ] as unknown as JournalEntry[]);

    expect(readJournal().map((w) => w.id)).toEqual(['ok']);
  });

  it('zablokowany zapis nie wywala aplikacji', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('zablokowany');
    });

    expect(() => appendJournalEntry({ module: 'czas', kind: 'ukonczone' })).not.toThrow();
    expect(appendJournalEntry({ module: 'czas', kind: 'ukonczone' })).toBeNull();
  });

  it('zablokowany odczyt nie wywala aplikacji', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('zablokowany');
    });

    expect(readJournal()).toEqual([]);
  });
});

describe('dziennik — przesuwane okno', () => {
  const teraz = dzien('2026-08-31T12:00:00.000Z');
  const wpis = (id: string, at: string): JournalEntry => ({
    id,
    module: 'czas',
    kind: 'ukonczone',
    at,
  });

  it('wpis starszy niż okno wypada przy zapisie', () => {
    const stary = new Date(teraz.getTime() - (JOURNAL_WINDOW_DAYS + 1) * 86400000).toISOString();
    zapiszWprost([wpis('stary', stary)]);

    appendJournalEntry({ module: 'czas', kind: 'ukonczone' }, teraz);

    expect(readJournal().some((w) => w.id === 'stary')).toBe(false);
  });

  it('wpis mieszczący się w oknie zostaje', () => {
    const swiezy = new Date(teraz.getTime() - (JOURNAL_WINDOW_DAYS - 1) * 86400000).toISOString();
    zapiszWprost([wpis('swiezy', swiezy)]);

    appendJournalEntry({ module: 'czas', kind: 'ukonczone' }, teraz);

    expect(readJournal().some((w) => w.id === 'swiezy')).toBe(true);
  });

  it('limit ścina najstarsze, zostawiając najnowsze', () => {
    const nadmiar = Array.from({ length: JOURNAL_MAX_ENTRIES + 20 }, (_, i) =>
      wpis(`w-${i}`, new Date(teraz.getTime() - (JOURNAL_MAX_ENTRIES + 20 - i) * 60000).toISOString())
    );

    const przyciete = pruneEntries(nadmiar, teraz);

    expect(przyciete).toHaveLength(JOURNAL_MAX_ENTRIES);
    expect(przyciete[przyciete.length - 1].id).toBe(`w-${JOURNAL_MAX_ENTRIES + 19}`);
    expect(przyciete.some((w) => w.id === 'w-0')).toBe(false);
  });

  it('dziennik nie rośnie ponad limit mimo kolejnych zapisów', () => {
    const nadmiar = Array.from({ length: JOURNAL_MAX_ENTRIES, }, (_, i) =>
      wpis(`w-${i}`, new Date(teraz.getTime() - (JOURNAL_MAX_ENTRIES - i) * 60000).toISOString())
    );
    zapiszWprost(nadmiar);

    appendJournalEntry({ module: 'start', kind: 'ukonczone' }, teraz);

    expect(readJournal()).toHaveLength(JOURNAL_MAX_ENTRIES);
  });
});

describe('dziennik — agregacja', () => {
  const wpisy: JournalEntry[] = [
    { id: '1', module: 'czas', kind: 'ukonczone', at: '2026-08-30T09:00:00.000Z', minutes: 25 },
    { id: '2', module: 'start', kind: 'ukonczone', at: '2026-08-30T15:00:00.000Z', count: 4 },
    { id: '3', module: 'czas', kind: 'rozpoczete', at: '2026-08-31T09:00:00.000Z', minutes: 5 },
  ];

  it('po dniu: sumuje wpisy i minuty, wymienia moduły', () => {
    const dni = summarizeByDay(wpisy);

    expect(dni.map((d) => d.day)).toEqual(['2026-08-30', '2026-08-31']);
    expect(dni[0].entries).toBe(2);
    expect(dni[0].minutes).toBe(25);
    expect(dni[0].modules).toEqual(['czas', 'start']);
  });

  it('po dniu: nie wymyśla dni, w których nic się nie działo', () => {
    expect(summarizeByDay(wpisy)).toHaveLength(2);
  });

  it('po dniu: liczy dobę lokalną, nie UTC', () => {
    const wieczor = new Date(2026, 7, 30, 23, 30);
    expect(localDay(wieczor)).toBe('2026-08-30');
  });

  it('po module: pokazuje też moduły puste, bez rankingu', () => {
    const moduly = summarizeByModule(wpisy);

    expect(moduly.map((m) => m.module)).toEqual(['czas', 'skupienie', 'energia', 'start']);

    const czas = moduly.find((m) => m.module === 'czas');
    expect(czas?.entries).toBe(2);
    expect(czas?.minutes).toBe(30);
    expect(czas?.lastAt).toBe('2026-08-31T09:00:00.000Z');

    const skupienie = moduly.find((m) => m.module === 'skupienie');
    expect(skupienie?.entries).toBe(0);
    expect(skupienie?.lastAt).toBeNull();
  });

  it('bez argumentu agreguje to, co jest zapisane', () => {
    appendJournalEntry({ module: 'energia', kind: 'ukonczone', minutes: 10 });

    expect(summarizeByDay()).toHaveLength(1);
    expect(summarizeByModule().find((m) => m.module === 'energia')?.minutes).toBe(10);
  });
});
