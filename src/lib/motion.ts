/**
 * Warstwa ruchu.
 *
 * Zasada: ruch tylko tam, gdzie niesie informację o tym, skąd coś przyszło.
 * Żadnych ozdobnych pulsowań ani animowanych cyfr — dokładnie taki ruch
 * rozprasza osobę, dla której ta aplikacja powstała.
 */

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export const dur = {
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
} as const;

export const ease = {
  /** Spokojne wyhamowanie — bez sprężynowania i bez przestrzelenia. */
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export type MotionPreference = 'auto' | 'reduced' | 'full';

export const MOTION_STORAGE_KEY = 'ann_toolbox_motion';

export function isMotionPreference(v: unknown): v is MotionPreference {
  return v === 'auto' || v === 'reduced' || v === 'full';
}

export function readMotionPreference(): MotionPreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = localStorage.getItem(MOTION_STORAGE_KEY);
    return isMotionPreference(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeMotionPreference(pref: MotionPreference): void {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, pref);
  } catch {
    /* prywatne okno albo zablokowany zapis — ustawienie zostaje na tę sesję */
  }
}

/**
 * Łączy ustawienie systemowe z własnym.
 *
 * Własne jest konieczne: na Androidzie flaga systemowa bywa nietknięta, a
 * użytkowniczka może chcieć mniej ruchu niezależnie od systemu.
 */
export function useMotionPreference(): {
  preference: MotionPreference;
  setPreference: (p: MotionPreference) => void;
  reduced: boolean;
} {
  const systemReduced = useReducedMotion();
  const [preference, setPreferenceState] = useState<MotionPreference>(readMotionPreference);

  const setPreference = (p: MotionPreference) => {
    setPreferenceState(p);
    writeMotionPreference(p);
  };

  const reduced = preference === 'reduced' || (preference === 'auto' && !!systemReduced);

  // Przejścia Tailwinda nie przechodzą przez framera — stąd atrybut na <html>,
  // który podnosi warstwę CSS z tokens.css.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (reduced) root.dataset.motion = 'reduced';
    else delete root.dataset.motion;
  }, [reduced]);

  return { preference, setPreference, reduced };
}

/* ---- warianty współdzielone ---- */

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: dur.base, ease: ease.out },
} as const;

export const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: dur.fast, ease: ease.out },
} as const;

/** Arkusz: od dołu na telefonie, delikatne dojście skalą na szerokim ekranie. */
export const sheetFromBottom = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: { duration: dur.base, ease: ease.out },
} as const;

export const sheetCentered = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: dur.base, ease: ease.out },
} as const;
