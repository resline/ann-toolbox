/**
 * Nazwy modułów.
 *
 * Nazywają stan, w jakim jest użytkowniczka, a nie mechanizm w środku —
 * przy ADHD nawiguje się tym, czego się potrzebuje, nie tym, jak coś działa.
 */
export const modules = {
  czas: {
    title: 'Czas',
    purpose: 'Kiedy tracisz poczucie, ile minęło',
  },
  skupienie: {
    title: 'Skupienie',
    purpose: 'Kiedy trzeba wejść w pracę',
  },
  energia: {
    title: 'Energia',
    purpose: 'Kiedy bak jest pusty',
  },
  start: {
    title: 'Start',
    purpose: 'Kiedy nie możesz ruszyć z miejsca',
  },
} as const;
