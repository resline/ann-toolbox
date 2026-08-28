/** @type {import('tailwindcss').Config} */

/**
 * Kolory semantyczne czytają zmienne CSS z src/design/tokens.css w formacie
 * kanałowym, dzięki czemu działają modyfikatory przezroczystości (bg-surface/70).
 * Motyw przełącza atrybut [data-theme] na <html>.
 *
 * Palety `sage` / `warmgray` / `calm` zostają do czasu, aż wszystkie moduły
 * przejdą na tokeny — dziś opiera się na nich 672 wariantów `dark:`.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
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

        /* ---- palety zastane, do usunięcia w fazie domykającej ---- */
        sage: {
          50: '#F4F7F5',
          100: '#EAF0EC',
          200: '#D5E2D9',
          300: '#B4CBB9',
          400: '#8BAF94',
          500: '#628F70',
          600: '#4A6B5D',
          700: '#395348',
          800: '#2C4037',
          900: '#1F2D27',
          950: '#121C18',
        },
        warmgray: {
          50: '#FAF8F5',
          100: '#F8FAF8',
          200: '#E8ECE8',
          300: '#D2D8D2',
          400: '#A0AEC0',
          500: '#718096',
          600: '#4A5568',
          700: '#2D3748',
          750: '#242C3A',
          800: '#1A202C',
          850: '#161B27',
          900: '#111722',
          950: '#0A0E14',
        },
        calm: {
          cream: '#F8FAF8',
          mint: '#81E6D9',
          lavender: '#BEE3F8',
          sage: '#4A6B5D',
          graphite: '#2D3748',
          darkbg: '#1A202C',
          oled: '#000000',
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
