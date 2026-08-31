/**
 * Warstwa trwałego zapisu „Przystani".
 *
 * Aplikacja jest w całości offline — localStorage jest jedynym miejscem, gdzie
 * cokolwiek zostaje po zamknięciu karty. Stąd trzy rzeczy w jednym pliku:
 *
 * 1. rejestr kluczy — żeby nikt nie musiał ich szukać grepem po `src/`,
 *    a kopia zapasowa nie zapomniała o module dodanym pół roku później;
 * 2. `versionedPersist` — opakowanie konfiguracji `zustand/persist`, które
 *    NARZUCA `version` i `migrate`. Store bez wersji nie da się już napisać,
 *    więc pierwsza zmiana kształtu danych nie skasuje po cichu stanu;
 * 3. eksport i import całości — bo utrata localStorage (wyczyszczenie danych
 *    przeglądarki, reinstalacja PWA) to dziś utrata wszystkiego.
 */

import type { PersistOptions } from 'zustand/middleware';

/* ------------------------------------------------------------------ *
 * Rejestr kluczy
 * ------------------------------------------------------------------ */

/**
 * Wszystkie klucze localStorage aplikacji.
 *
 * Prefiks `ann_` odróżnia dane „Przystani" od czegokolwiek innego na tej
 * domenie — import i eksport chodzą wyłącznie po tej liście, więc klucz
 * spoza niej nigdy nie zostanie ruszony.
 */
export const STORAGE_KEYS = {
  /** Wybrany motyw (goły napis, np. `day`). */
  theme: 'ann_toolbox_theme',
  /** Ustawienie ruchu (goły napis: `auto` / `reduced` / `full`). */
  motion: 'ann_toolbox_motion',
  /** Czas — ustawienia mówiącego zegara. */
  czas: 'ann_speaking_clock_settings',
  /** Skupienie — presety i stan sesji. */
  skupienie: 'ann_visual_timer',
  /** Start — zadania, kroki i historia. */
  start: 'ann_micro_tasks',
  /** Energia — menu dopaminowe. */
  energia: 'ann_dopamine_menu',
  /** Ślad — dziennik zdarzeń (patrz src/lib/journal/journal.ts). */
  slad: 'ann_journal',
} as const;

export type StorageArea = keyof typeof STORAGE_KEYS;
export type StorageKey = (typeof STORAGE_KEYS)[StorageArea];

export const ALL_STORAGE_KEYS: readonly StorageKey[] = Object.freeze(
  Object.values(STORAGE_KEYS) as StorageKey[]
);

export function isStorageKey(value: unknown): value is StorageKey {
  return typeof value === 'string' && (ALL_STORAGE_KEYS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ *
 * Wersjonowana konfiguracja persist
 * ------------------------------------------------------------------ */

/**
 * Migracja zapisanego stanu.
 *
 * Dostaje surowy obiekt z localStorage i wersję, pod którą został zapisany —
 * nigdy nie wolno jej ufać kształtowi wejścia.
 */
export type StateMigration = (persisted: unknown, fromVersion: number) => unknown;

/**
 * Migracja zerowa: przepuszcza dotychczasowy kształt bez zmian.
 *
 * Ma sens tylko jako punkt odniesienia dla wersji 1 — od niej kolejne
 * migracje mają się o co oprzeć. Każda następna wersja dopisuje własną
 * gałąź zamiast podmieniać tę funkcję.
 */
export const passthroughMigration: StateMigration = (persisted) => persisted;

export interface VersionedPersistConfig<S> {
  /** Klucz z rejestru — literał nie przejdzie przez typ. */
  key: StorageKey;
  /** Wersja kształtu danych. Rośnie o 1 przy każdej zmianie kształtu. */
  version: number;
  /** Co zrobić ze stanem zapisanym pod starszą wersją. */
  migrate: StateMigration;
  /** Co w ogóle trafia do zapisu — domyślnie całość poza akcjami. */
  partialize?: PersistOptions<S, S>['partialize'];
  merge?: PersistOptions<S, S>['merge'];
  onRehydrateStorage?: PersistOptions<S, S>['onRehydrateStorage'];
}

/**
 * Konfiguracja `persist` z obowiązkową wersją.
 *
 * Wersja i migracja są wymagane w typie, więc nie da się już powtórzyć
 * sytuacji wyjściowej: trzy store'y zapisujące stan bez żadnego numeru,
 * przy których każda zmiana pola kończyła się cichym rozjechaniem danych.
 */
export function versionedPersist<S>(config: VersionedPersistConfig<S>): PersistOptions<S, S> {
  const { key, version, migrate, partialize, merge, onRehydrateStorage } = config;

  return {
    name: key,
    version,
    // Stan zapisany przed wprowadzeniem wersjonowania nie ma numeru — zustand
    // podaje wtedy `undefined`. Traktujemy go jako wersję 0, żeby migracja
    // mogła się na nim oprzeć zwykłym porównaniem, a nie sprawdzaniem typu.
    //
    // zustand oczekuje tu stanu store'a; migracja operuje na danych, więc
    // rzutowanie jest jedynym miejscem, gdzie te dwa światy się spotykają.
    migrate: (persisted, fromVersion) =>
      migrate(persisted, typeof fromVersion === 'number' ? fromVersion : 0) as S,
    ...(partialize ? { partialize } : {}),
    ...(merge ? { merge } : {}),
    ...(onRehydrateStorage ? { onRehydrateStorage } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * Dostęp do localStorage odporny na brak zgody
 * ------------------------------------------------------------------ */

/**
 * localStorage bywa niedostępny: prywatne okno, zablokowane ciasteczka,
 * wyłączony zapis w WebView. Wszystkie odczyty i zapisy idą przez te dwie
 * funkcje, żeby awaria kończyła się brakiem danych, a nie białym ekranem.
 */
function readRaw(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Eksport
 * ------------------------------------------------------------------ */

/** Wersja formatu KOPII — niezależna od wersji poszczególnych store'ów. */
export const BACKUP_SCHEMA_VERSION = 1;

/** Sygnatura pliku. Odróżnia kopię „Przystani" od dowolnego innego JSON-a. */
export const BACKUP_APP_ID = 'przystan';

export interface AppBackup {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  /** ISO 8601, wyłącznie informacyjnie — import go nie używa. */
  exportedAt: string;
  /** Klucz rejestru → zawartość. Napis dla ustawień, obiekt dla store'ów. */
  data: Partial<Record<StorageKey, unknown>>;
}

/**
 * Zapis store'ów to JSON, ale motyw i ruch siedzą jako gołe napisy.
 * Rozstrzygamy po pierwszym znaku zamiast po `JSON.parse`, bo parser
 * zamieniłby `"day"` w coś, czego nie da się jednoznacznie zapisać z powrotem.
 */
function decodeStored(raw: string): unknown {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/** Odwrotność `decodeStored`. `null` oznacza wartość, której nie zapiszemy. */
function encodeStored(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value !== null && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Cały stan aplikacji jako zwykły obiekt JSON.
 *
 * Klucze bez zapisanej wartości po prostu nie wchodzą do kopii — pusty wpis
 * przy imporcie byłby nie do odróżnienia od świadomego wyczyszczenia.
 */
export function exportAppData(now: Date = new Date()): AppBackup {
  const data: Partial<Record<StorageKey, unknown>> = {};

  for (const key of ALL_STORAGE_KEYS) {
    const raw = readRaw(key);
    if (raw === null) continue;
    data[key] = decodeStored(raw);
  }

  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
}

/** Kopia gotowa do zapisania w pliku — wcięcie dla czytelności dla człowieka. */
export function serializeAppData(backup: AppBackup = exportAppData()): string {
  return JSON.stringify(backup, null, 2) + '\n';
}

/* ------------------------------------------------------------------ *
 * Import
 * ------------------------------------------------------------------ */

/**
 * Powody odrzucenia — kody, nie napisy dla użytkowniczki.
 * Tłumaczenie należy do warstwy copy, ta warstwa nic o interfejsie nie wie.
 */
export type ImportRejection =
  | 'nieczytelny-json'
  | 'nie-obiekt'
  | 'obca-kopia'
  | 'nowszy-format'
  | 'brak-danych'
  | 'zapis-niemozliwy';

export type SkipReason = 'nieznany-klucz' | 'zla-wartosc';

export interface SkippedEntry {
  key: string;
  reason: SkipReason;
}

export type ImportResult =
  | {
      ok: true;
      /** Klucze faktycznie nadpisane. */
      imported: StorageKey[];
      /** Co w pliku było, ale nie weszło. */
      skipped: SkippedEntry[];
    }
  | {
      ok: false;
      reason: ImportRejection;
      skipped: SkippedEntry[];
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Wczytuje kopię z powrotem do localStorage.
 *
 * Trzy zasady, wszystkie wzięte z tego, co potrafi pójść nie tak przy
 * ręcznym pliku wybranym z dysku:
 *
 * — najpierw cała walidacja, potem dopiero jakikolwiek zapis;
 * — zapis z odtworzeniem stanu poprzedniego, gdy którykolwiek klucz odmówi
 *   (limit miejsca kończy się wyjątkiem w połowie pętli — bez wycofania
 *   użytkowniczka zostałaby z połową swoich danych i połową cudzych);
 * — klucz nieobecny w pliku zostaje nietknięty; kopia jest uzupełnieniem
 *   stanu, nie jego kasowaniem.
 *
 * Uwaga dla wywołującego: store'y trzymają swój stan w pamięci i nie wiedzą
 * o podmianie — po udanym imporcie trzeba przeładować aplikację.
 */
export function importAppData(input: unknown): ImportResult {
  const skipped: SkippedEntry[] = [];

  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return { ok: false, reason: 'nieczytelny-json', skipped };
    }
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, reason: 'nie-obiekt', skipped };
  }

  if (parsed.app !== BACKUP_APP_ID) {
    return { ok: false, reason: 'obca-kopia', skipped };
  }

  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isFinite(schemaVersion)) {
    return { ok: false, reason: 'nie-obiekt', skipped };
  }
  // Plik z nowszego wydania może nieść kształt, którego ta wersja nie rozumie.
  // Starszy przechodzi — o zgodność kształtu dba już migracja store'a.
  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    return { ok: false, reason: 'nowszy-format', skipped };
  }

  if (!isPlainObject(parsed.data)) {
    return { ok: false, reason: 'nie-obiekt', skipped };
  }

  const planned: Array<{ key: StorageKey; value: string }> = [];

  for (const [key, value] of Object.entries(parsed.data)) {
    if (!isStorageKey(key)) {
      skipped.push({ key, reason: 'nieznany-klucz' });
      continue;
    }
    const encoded = encodeStored(value);
    if (encoded === null) {
      skipped.push({ key, reason: 'zla-wartosc' });
      continue;
    }
    planned.push({ key, value: encoded });
  }

  if (planned.length === 0) {
    return { ok: false, reason: 'brak-danych', skipped };
  }

  // migawka sprzed zapisu — jedyna droga powrotu, gdy zapis padnie w połowie
  const snapshot = new Map<StorageKey, string | null>();
  for (const entry of planned) snapshot.set(entry.key, readRaw(entry.key));

  const written: StorageKey[] = [];
  for (const entry of planned) {
    if (writeRaw(entry.key, entry.value)) {
      written.push(entry.key);
      continue;
    }

    for (const key of written) writeRaw(key, snapshot.get(key) ?? null);
    return { ok: false, reason: 'zapis-niemozliwy', skipped };
  }

  return { ok: true, imported: written, skipped };
}

/** Kasuje wyłącznie dane „Przystani", klucz po kluczu z rejestru. */
export function clearAppData(): void {
  for (const key of ALL_STORAGE_KEYS) writeRaw(key, null);
}
