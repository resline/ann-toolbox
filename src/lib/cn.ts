/**
 * cn — jedyny sposób łączenia klas Tailwinda w tej aplikacji.
 *
 * clsx rozwiązuje warunki, twMerge rozstrzyga konflikty (ostatnia klasa wygrywa).
 * Rozszerzenie o własne grupy jest konieczne: bez niego twMerge nie wie, że
 * `rounded-card` i `rounded-sheet` są w konflikcie, i zostawia obie.
 */

import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // promienie z tokenów — muszą kolidować z wbudowanymi rounded-*
      rounded: [{ rounded: ['control', 'card', 'sheet'] }],
      // cienie z tokenów — jw. wobec shadow-*
      shadow: [{ shadow: ['hairline', 'lift', 'sheet'] }],
      // skala liczników — jw. wobec text-sm / text-xl itd.
      'font-size': [{ text: ['2xs', 'display-1', 'display-2', 'display-3'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
