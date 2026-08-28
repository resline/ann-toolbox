/** @type {import('tailwindcss').Config} */

/**
 * Kolory semantyczne czytają zmienne CSS z src/design/tokens.css w formacie
 * kanałowym, dzięki czemu działają modyfikatory przezroczystości (bg-surface/70).
 * Motyw przełącza atrybut [data-theme] na <html>.
 *
 * Palet `sage` / `warmgray` / `calm` już nie ma — wszystkie moduły czytają
 * tokeny. Pilnuje tego src/design/noLegacyStyles.test.ts.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ---- warstwa tokenów ---- */
        canvas: token('canvas'),
        surface: {
          DEFAULT: token('surface'),
          raised: token('surface-raised'),
          sunken: token('surface-sunken'),
          hover: token('surface-hover'),
          active: token('surface-active'),
        },
        ink: {
          DEFAULT: token('ink'),
          muted: token('ink-muted'),
          faint: token('ink-faint'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
          faint: token('line-faint'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          active: token('accent-active'),
          soft: token('accent-soft'),
          ink: token('accent-ink'),
          contrast: token('accent-contrast'),
        },
        /* alias ustawiany przez [data-module] — prymitywy kolorują się same */
        module: {
          DEFAULT: token('module'),
          soft: token('module-soft'),
          ink: token('module-ink'),
        },
        positive: {
          DEFAULT: token('positive'),
          soft: token('positive-soft'),
          ink: token('positive-ink'),
        },
        caution: {
          DEFAULT: token('caution'),
          soft: token('caution-soft'),
          ink: token('caution-ink'),
        },
        attention: {
          DEFAULT: token('attention'),
          soft: token('attention-soft'),
          ink: token('attention-ink'),
        },
      },

      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        sheet: 'var(--radius-sheet)',
      },

      boxShadow: {
        hairline: 'var(--shadow-hairline)',
        lift: 'var(--shadow-lift)',
        sheet: 'var(--shadow-sheet)',
      },

      /* Skala bazowa zostaje domyślna (jest dobra i sprawdzona).
         Dochodzą tylko stopnie, których Tailwind nie ma: mikroetykieta
         i liczniki. Wagi ograniczamy do 400/500/600 — hierarchia idzie
         rozmiarem i odstępem, nie grubością. */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        'display-1': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-2': ['4.75rem', { lineHeight: '0.95', letterSpacing: '-0.025em' }],
        'display-3': ['6.5rem', { lineHeight: '0.92', letterSpacing: '-0.03em' }],
      },

      spacing: {
        gutter: 'var(--space-gutter)',
        section: 'var(--space-section)',
        card: 'var(--space-card)',
        tap: 'var(--tap)',
        tabbar: 'var(--tabbar-h)',
      },

      minHeight: {
        tap: 'var(--tap)',
      },
      minWidth: {
        tap: 'var(--tap)',
      },

      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
