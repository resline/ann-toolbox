/**
 * Tokeny wizualne „Przystani" — jedyne źródło prawdy dla kolorów.
 *
 * Wartości podane w sRGB (hex), bo tylko ten format liczy jsdom w
 * `getComputedStyle`, a bez tego test kontrastu w tokens.test.ts nie działa.
 * Kolory dobierane w OKLCH; hex jest formą wysyłkową.
 *
 * `tokens.css` jest GENEROWANY z tego pliku (scripts/build-tokens.mjs).
 * Test parytetu pilnuje, żeby oba pliki się nie rozjechały.
 */

export type ThemeId = 'day' | 'dusk' | 'oled';

export const THEME_IDS = ['day', 'dusk', 'oled'] as const;

type ByTheme = Record<ThemeId, string>;

/* ------------------------------------------------------------------ *
 * Powierzchnie — hierarchia „papier na biurku"
 * ------------------------------------------------------------------ */
export const SURFACE_TOKENS = {
  'canvas':          { day: '#F6F4EF', dusk: '#1B1917', oled: '#000000' },
  'surface':         { day: '#FDFCF9', dusk: '#23211E', oled: '#0B0B0C' },
  'surface-raised':  { day: '#FFFFFF', dusk: '#2B2825', oled: '#141416' },
  'surface-sunken':  { day: '#EFEDE7', dusk: '#151412', oled: '#000000' },
  'surface-hover':   { day: '#F1EFE9', dusk: '#2A2724', oled: '#17171A' },
  'surface-active':  { day: '#E9E6DE', dusk: '#322E2A', oled: '#1E1E22' },
} satisfies Record<string, ByTheme>;

/* ------------------------------------------------------------------ *
 * Tekst — trzy stopnie, wszystkie przechodzą AA na `surface`
 * ------------------------------------------------------------------ */
export const INK_TOKENS = {
  'ink':        { day: '#23211D', dusk: '#EFEBE3', oled: '#D8D4CC' },
  'ink-muted':  { day: '#57534B', dusk: '#B6AFA4', oled: '#9A958D' },
  // dusk podniesiony z #938C81: dawał 4.40:1 na `surface-raised`, czyli
  // najjaśniejszej powierzchni motywu — próg AA liczymy wobec wszystkich
  'ink-faint':  { day: '#6C665E', dusk: '#979085', oled: '#837D75' },
} satisfies Record<string, ByTheme>;

/* ------------------------------------------------------------------ *
 * Linie — nośnik hierarchii zamiast cieni
 * ------------------------------------------------------------------ */
export const LINE_TOKENS = {
  'line':         { day: '#DFDBD2', dusk: '#363230', oled: '#232326' },
  // dobrane tak, by trafić w 3:1 wobec `surface` — to obrys pól formularza,
  // więc podlega WCAG 1.4.11 (kontrast elementów nietekstowych)
  'line-strong':  { day: '#969188', dusk: '#746E66', oled: '#5F5F64' },
  'line-faint':   { day: '#ECE9E2', dusk: '#2B2825', oled: '#161618' },
} satisfies Record<string, ByTheme>;

/* ------------------------------------------------------------------ *
 * Akcent + stany. `focus-ring` jest osobny, bo musi mieć ≥3:1
 * jednocześnie na `surface` i na `accent-soft`.
 * ------------------------------------------------------------------ */
export const ACCENT_TOKENS = {
  'accent':           { day: '#3F6B5B', dusk: '#7FB79F', oled: '#7CC9AA' },
  'accent-hover':     { day: '#35594C', dusk: '#93C6AF', oled: '#8FD6B8' },
  'accent-active':    { day: '#2B4A3F', dusk: '#6BA48C', oled: '#68B695' },
  'accent-soft':      { day: '#E4EDE7', dusk: '#26332D', oled: '#10231C' },
  'accent-ink':       { day: '#2C4A3F', dusk: '#A7D3BE', oled: '#9BDCC2' },
  'accent-contrast':  { day: '#FBFDFB', dusk: '#16241E', oled: '#04140E' },
  'focus-ring':       { day: '#2B6B58', dusk: '#8FC6AD', oled: '#7CC9AA' },
} satisfies Record<string, ByTheme>;

/* ------------------------------------------------------------------ *
 * Semantyczne — świadomie bez krzyczącej czerwieni
 * ------------------------------------------------------------------ */
export const SEMANTIC_TOKENS = {
  'positive':        { day: '#3F6B4A', dusk: '#86BC93', oled: '#7FC58F' },
  'positive-soft':   { day: '#E3EDE4', dusk: '#24312A', oled: '#0E2214' },
  'positive-ink':    { day: '#2E5136', dusk: '#A6D0AF', oled: '#9BD5A8' },
  'caution':         { day: '#7A5D1B', dusk: '#D7B36A', oled: '#D4AF66' },
  'caution-soft':    { day: '#F3EBD8', dusk: '#332D1F', oled: '#241C0E' },
  'caution-ink':     { day: '#5E4713', dusk: '#E3C68B', oled: '#E2C489' },
  'attention':       { day: '#9A4A38', dusk: '#D08A76', oled: '#CE8974' },
  'attention-soft':  { day: '#F5E4DF', dusk: '#33241F', oled: '#241310' },
  'attention-ink':   { day: '#7C3A2C', dusk: '#E0A895', oled: '#DFA795' },
} satisfies Record<string, ByTheme>;

/* ------------------------------------------------------------------ *
 * Akcent per moduł. Prymitywy czytają alias `--module`, który ustawia
 * wrapper przez [data-module] — dzięki temu zero prop drillingu.
 * ------------------------------------------------------------------ */
export const MODULE_TOKENS = {
  'm-time':          { day: '#3F6B5B', dusk: '#7FB79F', oled: '#7CC9AA' },
  'm-time-soft':     { day: '#E4EDE7', dusk: '#26332D', oled: '#10231C' },
  'm-time-ink':      { day: '#2C4A3F', dusk: '#A7D3BE', oled: '#9BDCC2' },
  'm-focus':         { day: '#3D5E77', dusk: '#7FA8C6', oled: '#7FB4DA' },
  'm-focus-soft':    { day: '#E3EAF0', dusk: '#232C33', oled: '#0E1A24' },
  'm-focus-ink':     { day: '#2B4356', dusk: '#A6C7DD', oled: '#A3CBE6' },
  'm-energy':        { day: '#7E5227', dusk: '#D3A46B', oled: '#E0B173' },
  'm-energy-soft':   { day: '#F3E9DC', dusk: '#322A20', oled: '#241B0E' },
  'm-energy-ink':    { day: '#5F3D1C', dusk: '#E1BE90', oled: '#EAC796' },
  'm-start':         { day: '#6B4A78', dusk: '#B199CE', oled: '#BCA0E0' },
  'm-start-soft':    { day: '#EDE6F0', dusk: '#2B2533', oled: '#1A1224' },
  'm-start-ink':     { day: '#4E3558', dusk: '#C9B8DE', oled: '#CFBCEB' },
} satisfies Record<string, ByTheme>;

/* ------------------------------------------------------------------ *
 * Palety dysku Time Timera — wybór użytkowniczki, więc zostają wszystkie
 * pięć. Przeniesione z twardego kodu w TimeTimerDisc, dzięki czemu dysk
 * staje się świadomy motywu: bursztyn na OLED przestaje oślepiać.
 * ------------------------------------------------------------------ */
export const DISC_TOKENS = {
  'disc-sage-from':      { day: '#5B8272', dusk: '#6E9A87', oled: '#638C7A' },
  'disc-sage-to':        { day: '#4A6B5D', dusk: '#567E6C', oled: '#4E7261' },
  'disc-sage-glow':      { day: '#4A6B5D', dusk: '#567E6C', oled: '#4E7261' },
  'disc-amber-from':     { day: '#F59E0B', dusk: '#C79246', oled: '#B8863E' },
  'disc-amber-to':       { day: '#D97706', dusk: '#A8752F', oled: '#9A6A28' },
  'disc-amber-glow':     { day: '#D97706', dusk: '#A8752F', oled: '#9A6A28' },
  'disc-lavender-from':  { day: '#8B5CF6', dusk: '#9A7FD0', oled: '#8D74C0' },
  'disc-lavender-to':    { day: '#7C3AED', dusk: '#7F63B4', oled: '#7259A6' },
  'disc-lavender-glow':  { day: '#7C3AED', dusk: '#7F63B4', oled: '#7259A6' },
  'disc-rose-from':      { day: '#F43F5E', dusk: '#D0707F', oled: '#C0656F' },
  'disc-rose-to':        { day: '#E11D48', dusk: '#B25260', oled: '#A34955' },
  'disc-rose-glow':      { day: '#E11D48', dusk: '#B25260', oled: '#A34955' },
  'disc-ocean-from':     { day: '#0EA5E9', dusk: '#4E96C0', oled: '#478AB0' },
  'disc-ocean-to':       { day: '#0284C7', dusk: '#3A79A3', oled: '#346D93' },
  'disc-ocean-glow':     { day: '#0284C7', dusk: '#3A79A3', oled: '#346D93' },
} satisfies Record<string, ByTheme>;

/** Wszystkie tokeny kolorystyczne w jednym miejscu. */
export const COLOR_TOKENS = {
  ...SURFACE_TOKENS,
  ...INK_TOKENS,
  ...LINE_TOKENS,
  ...ACCENT_TOKENS,
  ...SEMANTIC_TOKENS,
  ...MODULE_TOKENS,
  ...DISC_TOKENS,
} satisfies Record<string, ByTheme>;

export type ColorTokenName = keyof typeof COLOR_TOKENS;

/* ------------------------------------------------------------------ *
 * Tokeny niekolorystyczne — wspólne dla wszystkich motywów
 * ------------------------------------------------------------------ */
export const SIZE_TOKENS = {
  'radius-control': '10px',
  'radius-card': '16px',
  'radius-sheet': '24px',
  /** Jeden standard pola dotykowego. Wcześniej współistniały 48px i 44px. */
  'tap': '48px',
  'tabbar-h': '64px',
  'space-gutter': '20px',
  'space-section': '32px',
  'space-card': '16px',
} as const;

/** Motyw jasny/ciemny — steruje `color-scheme` i doborem cieni. */
export const THEME_IS_DARK: Record<ThemeId, boolean> = {
  day: false,
  dusk: true,
  oled: true,
};
