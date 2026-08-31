/**
 * Haptyka — potwierdzenie, które da się poczuć bez patrzenia.
 *
 * Powód istnienia: telefon bywa wyciszony, a wzrok zajęty czymś innym. Krótkie
 * drgnięcie mówi „zapisane", zanim oko zdąży wrócić na ekran. To jest kanał
 * o wyciszaniu, nie o alarmowaniu — stąd wzorce liczone w dziesiątkach
 * milisekund i maksymalnie dwa impulsy.
 *
 * Nazwy opisują ZNACZENIE sygnału, nie długość wibracji: dzięki temu wzorzec da
 * się zmienić w jednym miejscu, nie polując po modułach na `[10, 40, 10]`.
 *
 * Milczy tam, gdzie API nie istnieje (iOS Safari, większość desktopów), przy
 * ograniczonym ruchu i przy wyłączonym przełączniku — zawsze bez wyjątku
 * w górę, bo wibracja nie jest nigdy ważniejsza od działania, które zgłasza.
 */

import { readMotionPreference } from '../motion';

export const HAPTICS_STORAGE_KEY = 'ann_toolbox_haptics';

export type HapticsPreference = 'on' | 'off';

/** Domyślnie włączone — użytkowniczka poprosiła o wibracje wprost. */
export const DEFAULT_HAPTICS_PREFERENCE: HapticsPreference = 'on';

/**
 * Znaczenia, jakie umiemy przekazać dotykiem. Cztery, bo piątego nikt nie
 * odróżni palcem — a nierozróżnialny sygnał to tylko szum.
 */
export type HapticSignal = 'tap' | 'confirm' | 'complete' | 'warning';

/** Wzorce w milisekundach: impuls, przerwa, impuls. */
export const HAPTIC_PATTERNS: Record<HapticSignal, readonly number[]> = {
  /** Dotknięcie — ledwo wyczuwalne, ma tylko potwierdzić trafienie w cel. */
  tap: [10],
  /** Potwierdzenie — coś zostało zapisane albo zaczęte. */
  confirm: [18],
  /** Ukończenie — dwa krótkie drgnięcia, jedyny sygnał „to już koniec". */
  complete: [14, 70, 14],
  /** Ostrzeżenie — najdłuższy, ale nadal poniżej ćwierci sekundy. */
  warning: [26, 90, 26],
};

export function isHapticsPreference(value: unknown): value is HapticsPreference {
  return value === 'on' || value === 'off';
}

export function readHapticsPreference(): HapticsPreference {
  if (typeof window === 'undefined') return DEFAULT_HAPTICS_PREFERENCE;
  try {
    const raw = localStorage.getItem(HAPTICS_STORAGE_KEY);
    return isHapticsPreference(raw) ? raw : DEFAULT_HAPTICS_PREFERENCE;
  } catch {
    return DEFAULT_HAPTICS_PREFERENCE;
  }
}

export function writeHapticsPreference(preference: HapticsPreference): void {
  try {
    localStorage.setItem(HAPTICS_STORAGE_KEY, preference);
  } catch {
    /* prywatne okno albo zablokowany zapis — ustawienie zostaje na tę sesję */
  }
}

/** Czy przeglądarka w ogóle umie zawibrować. */
export function isHapticsSupported(): boolean {
  return resolveVibrate() !== null;
}

/**
 * Ta sama logika co w useMotionPreference: własne ustawienie ma pierwszeństwo,
 * a przy „auto" decyduje system. Czytamy ją tutaj ręcznie, bo sygnał wychodzi
 * także spoza Reacta — z licznika, z zapisu, z tła.
 */
function prefersReducedMotion(): boolean {
  const preference = readMotionPreference();
  if (preference === 'reduced') return true;
  if (preference === 'full') return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

type VibrateFn = (pattern: number | number[]) => boolean;

function resolveVibrate(): VibrateFn | null {
  if (typeof navigator === 'undefined') return null;
  const vibrate = (navigator as Navigator & { vibrate?: VibrateFn }).vibrate;
  if (typeof vibrate !== 'function') return null;
  // Wiązanie z navigatorem: wywołanie na odczepionej referencji rzuca
  // „Illegal invocation" w Chrome.
  return vibrate.bind(navigator) as VibrateFn;
}

/** Czy sygnał dotykowy w tej chwili dojdzie do skutku. */
export function isHapticsEnabled(): boolean {
  return isHapticsSupported() && readHapticsPreference() === 'on' && !prefersReducedMotion();
}

/**
 * Wspólne wejście. Zwraca informację, czy wibracja faktycznie poszła — moduł
 * może na tej podstawie sięgnąć po inny kanał (dźwięk, powiadomienie).
 */
export function haptic(signal: HapticSignal): boolean {
  const pattern = HAPTIC_PATTERNS[signal];
  if (!pattern) return false;
  if (!isHapticsEnabled()) return false;

  const vibrate = resolveVibrate();
  if (!vibrate) return false;

  try {
    return vibrate([...pattern]) !== false;
  } catch {
    // Niektóre przeglądarki rzucają przy wibracji bez wcześniejszego gestu.
    return false;
  }
}

/** Dotknięcie celu — przycisk, kafelek, krok listy. */
export function hapticTap(): boolean {
  return haptic('tap');
}

/** Rzecz zapisana, zaczęta albo przełączona. */
export function hapticConfirm(): boolean {
  return haptic('confirm');
}

/** Koniec sesji, ostatni krok zadania, wypełniona miarka. */
export function hapticComplete(): boolean {
  return haptic('complete');
}

/** Coś się nie udało albo wymaga uwagi teraz. */
export function hapticWarning(): boolean {
  return haptic('warning');
}

/**
 * Przerywa trwający wzorzec. Zawsze wolno wywołać — cisza nie wymaga zgody
 * ani włączonego przełącznika.
 */
export function stopHaptics(): void {
  const vibrate = resolveVibrate();
  if (!vibrate) return;
  try {
    vibrate(0);
  } catch {
    /* nic nie drga — i o to chodziło */
  }
}
