import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ALL_STORAGE_KEYS,
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  STORAGE_KEYS,
  clearAppData,
  exportAppData,
  importAppData,
  isStorageKey,
  passthroughMigration,
  serializeAppData,
  versionedPersist,
} from './persist';

/**
 * Ten plik pilnuje dwóch rzeczy, których nie widać na ekranie i które wychodzą
 * dopiero wtedy, gdy jest za późno: że kopia zapasowa obejmuje WSZYSTKIE dane,
 * i że nieudany import nie zostawia po sobie połowy stanu.
 */

const OBCY_KLUCZ = 'inna-aplikacja';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rejestr kluczy', () => {
  it('każdy klucz ma prefiks ann_ i występuje raz', () => {
    expect(ALL_STORAGE_KEYS.every((key) => key.startsWith('ann_'))).toBe(true);
    expect(new Set(ALL_STORAGE_KEYS).size).toBe(ALL_STORAGE_KEYS.length);
  });

  it('zna wszystkie klucze, które store’y i ustawienia naprawdę zapisują', () => {
    expect([...ALL_STORAGE_KEYS].sort()).toEqual(
      [
        'ann_dopamine_menu',
        'ann_journal',
        'ann_micro_tasks',
        'ann_speaking_clock_settings',
        'ann_toolbox_motion',
        'ann_toolbox_theme',
        'ann_visual_timer',
      ].sort()
    );
  });

  it('rozpoznaje własny klucz i odrzuca cudzy', () => {
    expect(isStorageKey(STORAGE_KEYS.energia)).toBe(true);
    expect(isStorageKey(OBCY_KLUCZ)).toBe(false);
    expect(isStorageKey(undefined)).toBe(false);
  });
});

describe('versionedPersist', () => {
  it('przekłada klucz na nazwę i niesie wersję', () => {
    const config = versionedPersist<{ a: number }>({
      key: STORAGE_KEYS.skupienie,
      version: 3,
      migrate: passthroughMigration,
    });

    expect(config.name).toBe('ann_visual_timer');
    expect(config.version).toBe(3);
  });

  it('migracja zerowa oddaje zapisany kształt bez zmian', () => {
    const config = versionedPersist<{ a: number }>({
      key: STORAGE_KEYS.energia,
      version: 1,
      migrate: passthroughMigration,
    });

    const stan = { a: 1, b: [2, 3] };
    expect(config.migrate?.(stan, 0)).toBe(stan);
  });

  it('przepuszcza migrację, która faktycznie zmienia kształt', () => {
    const config = versionedPersist<{ ile: number }>({
      key: STORAGE_KEYS.start,
      version: 2,
      migrate: (persisted, from) =>
        from < 2 ? { ile: (persisted as { count: number }).count } : persisted,
    });

    expect(config.migrate?.({ count: 7 }, 1)).toEqual({ ile: 7 });
  });

  it('stan zapisany bez numeru wersji trafia do migracji jako wersja 0', () => {
    const widzianeWersje: number[] = [];
    const config = versionedPersist<{ a: number }>({
      key: STORAGE_KEYS.skupienie,
      version: 1,
      migrate: (persisted, from) => {
        widzianeWersje.push(from);
        return persisted;
      },
    });

    // dokładnie to podaje zustand dla zapisu sprzed wersjonowania
    (config.migrate as (p: unknown, v?: number) => unknown)({ a: 1 }, undefined);

    expect(widzianeWersje).toEqual([0]);
  });

  it('nie dokłada partialize, gdy nie poproszono', () => {
    const config = versionedPersist<{ a: number }>({
      key: STORAGE_KEYS.czas,
      version: 1,
      migrate: passthroughMigration,
    });

    expect('partialize' in config).toBe(false);
  });
});

describe('eksport', () => {
  it('zbiera store’y jako obiekty, a ustawienia jako napisy', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'dusk');
    localStorage.setItem(STORAGE_KEYS.energia, JSON.stringify({ state: { items: [] } }));

    const kopia = exportAppData();

    expect(kopia.app).toBe(BACKUP_APP_ID);
    expect(kopia.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(kopia.data[STORAGE_KEYS.theme]).toBe('dusk');
    expect(kopia.data[STORAGE_KEYS.energia]).toEqual({ state: { items: [] } });
  });

  it('pomija klucze bez zapisanej wartości i nie rusza cudzych', () => {
    localStorage.setItem(STORAGE_KEYS.motion, 'reduced');
    localStorage.setItem(OBCY_KLUCZ, 'cokolwiek');

    const kopia = exportAppData();

    expect(Object.keys(kopia.data)).toEqual([STORAGE_KEYS.motion]);
  });

  it('nie wywraca się na uszkodzonym zapisie store’a', () => {
    localStorage.setItem(STORAGE_KEYS.start, '{to nie jest json');

    expect(exportAppData().data[STORAGE_KEYS.start]).toBe('{to nie jest json');
  });

  it('nie wywraca się, gdy localStorage jest zablokowany', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('zablokowany');
    });

    expect(exportAppData().data).toEqual({});
  });

  it('daje plik z datą i wcięciem', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'oled');
    const plik = serializeAppData(exportAppData(new Date('2026-08-31T10:00:00.000Z')));

    expect(plik).toContain('"exportedAt": "2026-08-31T10:00:00.000Z"');
    expect(plik.endsWith('\n')).toBe(true);
  });
});

describe('import — plik, którego nie przyjmiemy', () => {
  it('odrzuca nieczytelny JSON', () => {
    const wynik = importAppData('{{{');
    expect(wynik.ok).toBe(false);
    expect(wynik.ok === false && wynik.reason).toBe('nieczytelny-json');
  });

  it('odrzuca coś, co nie jest obiektem', () => {
    expect(importAppData('[]').ok).toBe(false);
    expect(importAppData(42).ok).toBe(false);
    expect(importAppData(null).ok).toBe(false);
  });

  it('odrzuca kopię innej aplikacji', () => {
    const wynik = importAppData({ app: 'cudza', schemaVersion: 1, data: {} });
    expect(wynik.ok === false && wynik.reason).toBe('obca-kopia');
  });

  it('odrzuca plik z nowszej wersji aplikacji', () => {
    const wynik = importAppData({
      app: BACKUP_APP_ID,
      schemaVersion: BACKUP_SCHEMA_VERSION + 1,
      data: { [STORAGE_KEYS.theme]: 'day' },
    });

    expect(wynik.ok === false && wynik.reason).toBe('nowszy-format');
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
  });

  it('odrzuca plik, w którym nie ma ani jednego znanego klucza', () => {
    const wynik = importAppData({
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      data: { [OBCY_KLUCZ]: 'x' },
    });

    expect(wynik.ok === false && wynik.reason).toBe('brak-danych');
    expect(wynik.skipped).toEqual([{ key: OBCY_KLUCZ, reason: 'nieznany-klucz' }]);
  });

  it('nie zapisuje niczego, gdy plik został odrzucony', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'day');
    importAppData({ app: 'cudza', schemaVersion: 1, data: { [STORAGE_KEYS.theme]: 'oled' } });

    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('day');
  });
});

describe('import — plik, który przyjmiemy', () => {
  it('wraca do stanu sprzed eksportu', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'oled');
    localStorage.setItem(STORAGE_KEYS.motion, 'reduced');
    localStorage.setItem(STORAGE_KEYS.skupienie, JSON.stringify({ state: { presety: 2 }, version: 1 }));
    const kopia = serializeAppData();

    localStorage.clear();
    const wynik = importAppData(kopia);

    expect(wynik.ok).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('oled');
    expect(localStorage.getItem(STORAGE_KEYS.motion)).toBe('reduced');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.skupienie) as string)).toEqual({
      state: { presety: 2 },
      version: 1,
    });
  });

  it('przyjmuje starszy format kopii', () => {
    const wynik = importAppData({
      app: BACKUP_APP_ID,
      schemaVersion: BACKUP_SCHEMA_VERSION - 1,
      data: { [STORAGE_KEYS.theme]: 'dusk' },
    });

    expect(wynik.ok).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dusk');
  });

  it('bierze znane klucze i mówi, co odrzucił', () => {
    const wynik = importAppData({
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      data: {
        [STORAGE_KEYS.theme]: 'day',
        [STORAGE_KEYS.energia]: 17,
        [OBCY_KLUCZ]: 'x',
      },
    });

    expect(wynik.ok === true && wynik.imported).toEqual([STORAGE_KEYS.theme]);
    expect(wynik.skipped).toEqual([
      { key: STORAGE_KEYS.energia, reason: 'zla-wartosc' },
      { key: OBCY_KLUCZ, reason: 'nieznany-klucz' },
    ]);
    expect(localStorage.getItem(STORAGE_KEYS.energia)).toBeNull();
  });

  it('nie kasuje kluczy, których w kopii nie było', () => {
    localStorage.setItem(STORAGE_KEYS.start, JSON.stringify({ state: { zadania: 3 } }));

    importAppData({ app: BACKUP_APP_ID, schemaVersion: 1, data: { [STORAGE_KEYS.theme]: 'day' } });

    expect(localStorage.getItem(STORAGE_KEYS.start)).toBe(JSON.stringify({ state: { zadania: 3 } }));
  });
});

describe('import — awaria w połowie zapisu', () => {
  it('wycofuje wszystko, gdy któryś klucz odmówi zapisu', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'day');
    localStorage.setItem(STORAGE_KEYS.motion, 'auto');

    const zapisz = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key === STORAGE_KEYS.motion) throw new Error('brak miejsca');
      zapisz.call(this, key, value);
    });

    const wynik = importAppData({
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      data: { [STORAGE_KEYS.theme]: 'oled', [STORAGE_KEYS.motion]: 'reduced' },
    });

    expect(wynik.ok === false && wynik.reason).toBe('zapis-niemozliwy');
    // stan sprzed importu wrócił w całości — żadnego pół-importu
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('day');
    expect(localStorage.getItem(STORAGE_KEYS.motion)).toBe('auto');
  });

  it('kasuje klucz, którego przed nieudanym importem nie było', () => {
    const zapisz = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key === STORAGE_KEYS.motion) throw new Error('brak miejsca');
      zapisz.call(this, key, value);
    });

    importAppData({
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      data: { [STORAGE_KEYS.theme]: 'oled', [STORAGE_KEYS.motion]: 'reduced' },
    });

    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
  });
});

describe('clearAppData', () => {
  it('kasuje dane aplikacji i zostawia cudze', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'day');
    localStorage.setItem(STORAGE_KEYS.slad, '{"version":1,"entries":[]}');
    localStorage.setItem(OBCY_KLUCZ, 'zostaje');

    clearAppData();

    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.slad)).toBeNull();
    expect(localStorage.getItem(OBCY_KLUCZ)).toBe('zostaje');
  });
});
