/**
 * Dziennik zdarzeń — warstwa faktów pod przyszły ekran „Ślad".
 *
 * ŁAGODNOŚĆ JEST TU WYMAGANIEM, NIE STYLEM.
 * Zapisujemy wyłącznie fakty: który moduł, co się stało, kiedy, ewentualnie
 * ile minut albo ile rzeczy. Nie ma tu i nie może się pojawić: serii dni
 * z rzędu, punktów, poziomów, odznak ani niczego, co porównuje dzisiaj
 * z wczoraj. Przerwa w używaniu aplikacji nie jest porażką i aplikacja nie
 * dostanie narzędzia, żeby to zasugerować — dlatego wpis nie ma pola, na
 * którym dałoby się taką miarę zbudować.
 *
 * Ta faza tylko zakłada warstwę. Podpięcie modułów jest zadaniem kolejnych.
 */

import { STORAGE_KEYS } from '../storage/persist';

/* ------------------------------------------------------------------ *
 * Kształt wpisu
 * ------------------------------------------------------------------ */

/** Moduły w kolejności, w jakiej stoją w nawigacji. */
export const JOURNAL_MODULES = ['czas', 'skupienie', 'energia', 'start'] as const;
export type JournalModule = (typeof JOURNAL_MODULES)[number];

/**
 * Rodzaje zdarzeń.
 *
 * Trzy, celowo. „Odłożone" jest równoprawne z „ukończone" — moduł Start
 * obiecuje, że do zadania można wrócić, więc odłożenie jest normalnym
 * zakończeniem, a nie porzuceniem.
 */
export const JOURNAL_KINDS = ['rozpoczete', 'ukonczone', 'odlozone'] as const;
export type JournalKind = (typeof JOURNAL_KINDS)[number];

export interface JournalEntry {
  id: string;
  module: JournalModule;
  kind: JournalKind;
  /** ISO 8601. */
  at: string;
  /** Ile minut trwało — tylko tam, gdzie moduł to wie. */
  minutes?: number;
  /** Ile rzeczy dotyczyło, np. kroków w zadaniu. */
  count?: number;
}

export type JournalEntryInput = Omit<JournalEntry, 'id' | 'at'> & { at?: Date | string };

/* ------------------------------------------------------------------ *
 * Granice zapisu
 * ------------------------------------------------------------------ */

/** Przesuwane okno. Starsze wpisy wypadają same przy najbliższym zapisie. */
export const JOURNAL_WINDOW_DAYS = 90;

/**
 * Twardy limit liczby wpisów.
 *
 * Okno dni nie wystarcza: localStorage ma około 5 MB na całą domenę, a jeden
 * intensywny dzień potrafi wygenerować setki zdarzeń. Przy przekroczeniu
 * zostają najnowsze.
 */
export const JOURNAL_MAX_ENTRIES = 500;

const JOURNAL_STORAGE_VERSION = 1;

interface JournalFile {
  version: number;
  entries: JournalEntry[];
}

/* ------------------------------------------------------------------ *
 * Odczyt i zapis
 * ------------------------------------------------------------------ */

function isJournalModule(value: unknown): value is JournalModule {
  return typeof value === 'string' && (JOURNAL_MODULES as readonly string[]).includes(value);
}

function isJournalKind(value: unknown): value is JournalKind {
  return typeof value === 'string' && (JOURNAL_KINDS as readonly string[]).includes(value);
}

/** Liczba przechodzi tylko wtedy, gdy jest skończona i nieujemna. */
function optionalCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

/**
 * Wpis odtworzony z zapisu.
 *
 * Cokolwiek nie pasuje do kształtu, wypada po cichu — uszkodzony wpis nie ma
 * prawa zabrać ze sobą reszty dziennika.
 */
function parseEntry(value: unknown): JournalEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (!isJournalModule(raw.module)) return null;
  if (!isJournalKind(raw.kind)) return null;
  if (typeof raw.at !== 'string' || Number.isNaN(Date.parse(raw.at))) return null;

  const entry: JournalEntry = { id: raw.id, module: raw.module, kind: raw.kind, at: raw.at };

  const minutes = optionalCount(raw.minutes);
  if (minutes !== undefined) entry.minutes = minutes;
  const count = optionalCount(raw.count);
  if (count !== undefined) entry.count = count;

  return entry;
}

function readFile(): JournalEntry[] {
  let raw: string | null = null;
  try {
    if (typeof localStorage === 'undefined') return [];
    raw = localStorage.getItem(STORAGE_KEYS.slad);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<JournalFile> | null;
    if (!parsed || !Array.isArray(parsed.entries)) return [];
    return parsed.entries
      .map(parseEntry)
      .filter((entry): entry is JournalEntry => entry !== null);
  } catch {
    // uszkodzony JSON — dziennik jest wygodą, nie danymi krytycznymi,
    // więc pusty wynik jest lepszy od wyjątku w drodze do ekranu
    return [];
  }
}

function writeFile(entries: JournalEntry[]): boolean {
  const file: JournalFile = { version: JOURNAL_STORAGE_VERSION, entries };
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEYS.slad, JSON.stringify(file));
    return true;
  } catch {
    /* prywatne okno albo brak miejsca — dziennik milczy zamiast przeszkadzać */
    return false;
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `j-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Przycięcie do okna i do limitu.
 *
 * Kolejność jest istotna: najpierw wypadają stare dni, potem dopiero limit
 * ścina nadmiar z najnowszych — inaczej jeden gęsty dzień wypchnąłby
 * wszystkie pozostałe.
 */
export function pruneEntries(entries: JournalEntry[], now: Date = new Date()): JournalEntry[] {
  const horizon = now.getTime() - JOURNAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const inWindow = entries
    .filter((entry) => Date.parse(entry.at) >= horizon)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return inWindow.length > JOURNAL_MAX_ENTRIES
    ? inWindow.slice(inWindow.length - JOURNAL_MAX_ENTRIES)
    : inWindow;
}

/**
 * Dopisuje fakt do dziennika.
 *
 * Zwraca zapisany wpis albo `null`, gdy zapis był niemożliwy. Wywołujący
 * nie musi tego sprawdzać — brak dziennika nie może zablokować modułu.
 */
export function appendJournalEntry(input: JournalEntryInput, now: Date = new Date()): JournalEntry | null {
  const at = input.at instanceof Date ? input.at : input.at ? new Date(input.at) : now;
  if (Number.isNaN(at.getTime())) return null;

  const entry: JournalEntry = {
    id: newId(),
    module: input.module,
    kind: input.kind,
    at: at.toISOString(),
  };
  const minutes = optionalCount(input.minutes);
  if (minutes !== undefined) entry.minutes = minutes;
  const count = optionalCount(input.count);
  if (count !== undefined) entry.count = count;

  const next = pruneEntries([...readFile(), entry], now);
  return writeFile(next) ? entry : null;
}

/** Wszystkie wpisy, od najstarszego. Uszkodzone już tu nie istnieją. */
export function readJournal(): JournalEntry[] {
  return readFile().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** Czyści dziennik. Osobno od reszty danych — to wyłącznie historia. */
export function clearJournal(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.slad);
  } catch {
    /* zablokowany zapis — nie ma czego czyścić w tej sesji */
  }
}

/* ------------------------------------------------------------------ *
 * Odczyt agregujący
 * ------------------------------------------------------------------ */

export interface JournalDaySummary {
  /** Dzień lokalny w formacie RRRR-MM-DD. */
  day: string;
  entries: number;
  minutes: number;
  /** Moduły, które tego dnia się pojawiły — w kolejności z nawigacji. */
  modules: JournalModule[];
}

export interface JournalModuleSummary {
  module: JournalModule;
  entries: number;
  minutes: number;
  /** ISO 8601 ostatniego zdarzenia — do napisu „ostatnio", nie do serii. */
  lastAt: string | null;
}

/**
 * Dzień lokalny, nie UTC.
 *
 * `toISOString` przesunąłby wieczorne zdarzenie na następną dobę i ekran
 * pokazałby coś, czego użytkowniczka nie zrobiła jutro.
 */
export function localDay(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Podsumowanie po dniach, od najstarszego dnia. Dni bez zdarzeń nie istnieją. */
export function summarizeByDay(entries: JournalEntry[] = readJournal()): JournalDaySummary[] {
  const buckets = new Map<string, JournalDaySummary>();

  for (const entry of entries) {
    const day = localDay(entry.at);
    const bucket = buckets.get(day) ?? { day, entries: 0, minutes: 0, modules: [] };
    bucket.entries += 1;
    bucket.minutes += entry.minutes ?? 0;
    if (!bucket.modules.includes(entry.module)) bucket.modules.push(entry.module);
    buckets.set(day, bucket);
  }

  for (const bucket of buckets.values()) {
    bucket.modules.sort(
      (a, b) => JOURNAL_MODULES.indexOf(a) - JOURNAL_MODULES.indexOf(b)
    );
  }

  return [...buckets.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Podsumowanie po modułach.
 *
 * Zwraca wszystkie moduły, także puste — ekran ma pokazać spokojny obraz
 * całości, a nie ranking tego, co było używane najczęściej.
 */
export function summarizeByModule(
  entries: JournalEntry[] = readJournal()
): JournalModuleSummary[] {
  return JOURNAL_MODULES.map((module) => {
    const own = entries.filter((entry) => entry.module === module);
    const lastAt = own.reduce<string | null>(
      (latest, entry) =>
        latest === null || Date.parse(entry.at) > Date.parse(latest) ? entry.at : latest,
      null
    );

    return {
      module,
      entries: own.length,
      minutes: own.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0),
      lastAt,
    };
  });
}
