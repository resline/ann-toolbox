/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
          800: '#1A202C',
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
        }
      },
      fontFamily: {
        sans: [
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
