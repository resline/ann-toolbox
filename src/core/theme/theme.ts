export type ThemeId = 'sage-calm' | 'dark-warm' | 'oled-night';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  isDark: boolean;
  className: string;
  accentColor: string;
  previewBg: string;
  previewCard: string;
  textColor: string;
}

export const THEME_STORAGE_KEY = 'ann_toolbox_theme';
export const DEFAULT_THEME: ThemeId = 'sage-calm';

export const THEMES: Record<ThemeId, ThemeConfig> = {
  'sage-calm': {
    id: 'sage-calm',
    name: 'Szałwia Spokojna',
    subtitle: 'Dzienny, organiczny',
    description: 'Kojąca szałwiowa zieleń, ciepły krem i miękki kontrast idealny na dzień bez męczenia wzroku.',
    isDark: false,
    className: 'theme-sage-calm',
    accentColor: '#4A6B5D',
    previewBg: '#F8FAF8',
    previewCard: '#FFFFFF',
    textColor: '#2D3748',
  },
  'dark-warm': {
    id: 'dark-warm',
    name: 'Ciepły Zmierzch',
    subtitle: 'Wieczorny, grafitowy',
    description: 'Ciepły grafit łupkowy z miętowymi akcentami chroniący przed przebodźcowaniem wieczorem.',
    isDark: true,
    className: 'theme-dark-warm',
    accentColor: '#81E6D9',
    previewBg: '#1A202C',
    previewCard: '#2D3748',
    textColor: '#F8FAF8',
  },
  'oled-night': {
    id: 'oled-night',
    name: 'Czerń OLED',
    subtitle: 'Nocny, oszczędny',
    description: 'Czysta czerń AMOLED z dyskretnym szmaragdem dla maksymalnej oszczędności baterii i skupienia w nocy.',
    isDark: true,
    className: 'theme-oled-night',
    accentColor: '#10B981',
    previewBg: '#000000',
    previewCard: '#111722',
    textColor: '#FAF8F5',
  },
};

export const THEME_LIST: ThemeConfig[] = [
  THEMES['sage-calm'],
  THEMES['dark-warm'],
  THEMES['oled-night'],
];

const THEME_CYCLE_ORDER: ThemeId[] = ['sage-calm', 'dark-warm', 'oled-night'];

/**
 * Get next theme in cycle sequence.
 */
export function getNextTheme(current: ThemeId): ThemeId {
  const currentIndex = THEME_CYCLE_ORDER.indexOf(current);
  if (currentIndex === -1) return DEFAULT_THEME;
  const nextIndex = (currentIndex + 1) % THEME_CYCLE_ORDER.length;
  return THEME_CYCLE_ORDER[nextIndex];
}

/**
 * Validate whether a string is a valid ThemeId.
 */
export function isValidThemeId(theme: unknown): theme is ThemeId {
  return typeof theme === 'string' && theme in THEMES;
}

/**
 * Apply theme classes to document root and sync dark mode class.
 */
export function applyThemeToDocument(theme: ThemeId): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const config = THEMES[theme] || THEMES[DEFAULT_THEME];

  // Remove existing theme classes
  for (const t of THEME_CYCLE_ORDER) {
    root.classList.remove(`theme-${t}`);
  }

  // Add current theme class
  root.classList.add(config.className);

  // Sync Tailwind darkMode class
  if (config.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update meta theme-color tag if present
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', config.previewBg);
  }
}
