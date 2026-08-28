/**
 * Motywy „Przystani".
 *
 * Wartości kolorów pochodzą wyłącznie z warstwy tokenów (src/design/tokens.ts),
 * żeby podgląd w przełączniku nie mógł rozjechać się z tym, co widać na ekranie.
 */

import { COLOR_TOKENS, THEME_IS_DARK, type ThemeId } from '../../design/tokens';

export type { ThemeId };

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  isDark: boolean;
  /** Kolor akcentu — do kropki podglądu w przełączniku. */
  accentColor: string;
  previewBg: string;
  previewCard: string;
  textColor: string;
}

export const THEME_STORAGE_KEY = 'ann_toolbox_theme';
export const DEFAULT_THEME: ThemeId = 'day';

/** Identyfikatory sprzed rebrandingu — czytane raz, przy pierwszym uruchomieniu. */
const LEGACY_THEME_IDS: Record<string, ThemeId> = {
  'sage-calm': 'day',
  'dark-warm': 'dusk',
  'oled-night': 'oled',
};

const describe = (id: ThemeId, name: string, subtitle: string, description: string): ThemeConfig => ({
  id,
  name,
  subtitle,
  description,
  isDark: THEME_IS_DARK[id],
  accentColor: COLOR_TOKENS.accent[id],
  previewBg: COLOR_TOKENS.canvas[id],
  previewCard: COLOR_TOKENS['surface-raised'][id],
  textColor: COLOR_TOKENS.ink[id],
});

export const THEMES: Record<ThemeId, ThemeConfig> = {
  day: describe(
    'day',
    'Dzień',
    'jasny, papierowy',
    'Ciepła biel papieru i przygaszona szałwia. Kontrast wystarczający, żeby czytać, i na tyle niski, żeby nie męczyć oczu przez cały dzień.'
  ),
  dusk: describe(
    'dusk',
    'Zmierzch',
    'ciepły, przygaszony',
    'Ciepły grafit bez niebieskiego chłodu. Na wieczór, kiedy jasny ekran zaczyna przeszkadzać.'
  ),
  oled: describe(
    'oled',
    'Noc',
    'czerń, oszczędna',
    'Czysta czerń dla ekranów AMOLED. Najmniej światła i najdłuższa bateria — na noc i na budzenie się w ciemności.'
  ),
};

export const THEME_LIST: ThemeConfig[] = [THEMES.day, THEMES.dusk, THEMES.oled];

const THEME_CYCLE_ORDER: ThemeId[] = ['day', 'dusk', 'oled'];

/** Następny motyw w cyklu. */
export function getNextTheme(current: ThemeId): ThemeId {
  const currentIndex = THEME_CYCLE_ORDER.indexOf(current);
  if (currentIndex === -1) return DEFAULT_THEME;
  return THEME_CYCLE_ORDER[(currentIndex + 1) % THEME_CYCLE_ORDER.length];
}

/** Czy wartość jest aktualnym identyfikatorem motywu. */
export function isValidThemeId(theme: unknown): theme is ThemeId {
  return typeof theme === 'string' && theme in THEMES;
}

/**
 * Odczytuje motyw z zapisanej wartości, tłumacząc identyfikatory sprzed
 * rebrandingu. Bez tego użytkowniczka po aktualizacji dostałaby motyw domyślny
 * zamiast swojego.
 */
export function resolveStoredTheme(stored: unknown): ThemeId | null {
  if (isValidThemeId(stored)) return stored;
  if (typeof stored === 'string' && stored in LEGACY_THEME_IDS) {
    return LEGACY_THEME_IDS[stored];
  }
  return null;
}

/**
 * Ustawia motyw na <html>.
 *
 * Poza atrybutem `data-theme` nadal dokłada klasę `dark`, bo moduły wciąż
 * opierają się na wariantach `dark:`. Klasa znika w fazie domykającej, kiedy
 * ostatni moduł przejdzie na tokeny.
 */
export function applyThemeToDocument(theme: ThemeId): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const config = THEMES[theme] || THEMES[DEFAULT_THEME];

  root.dataset.theme = config.id;
  root.classList.toggle('dark', config.isDark);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', config.previewBg);
  }
}
