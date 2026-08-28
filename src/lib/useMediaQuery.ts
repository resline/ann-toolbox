import { useEffect, useState } from 'react';

/**
 * Subskrybuje media query. Zwraca false przy pierwszym renderze w środowisku
 * bez `matchMedia` (SSR, część konfiguracji jsdom).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Od tego progu arkusz przestaje być wysuwany od dołu, a staje się oknem. */
export const MEDIA_WIDE = '(min-width: 768px)';
