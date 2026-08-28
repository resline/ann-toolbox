/**
 * Geometria tarczy Time Timera — czyste funkcje, bez Reacta i bez DOM-u.
 *
 * Wydzielone z komponentu, bo dzięki temu testy sprawdzają liczby zamiast
 * dopasowywać regexpem atrybut `d` ścieżki SVG albo szukać wewnętrznych klas
 * CSS. Ta sama wiedza, ale odporna na każdą zmianę wyglądu.
 *
 * Układ współrzędnych: viewBox 0 0 300 300, środek (150, 150).
 */

export type DiscDirection = 'clockwise' | 'counter-clockwise';

export const DISC = {
  cx: 150,
  cy: 150,
  /** Promień wypełnionego sektora. */
  radius: 112,
  bezelRadius: 144,
  tickOuterRadius: 124,
  majorTickInnerRadius: 114,
  minorTickInnerRadius: 119,
  numbersRadius: 137,
} as const;

/** Cyfry na obwodzie tarczy — jak w fizycznym Time Timerze. */
export const NUMBERS_SERIES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;

export interface SectorResult {
  /** Atrybut `d` ścieżki; pusty, gdy sektor jest pełny albo zerowy. */
  d: string;
  /** Koniec łuku — punkt, w który celuje wskazówka. */
  endX: number;
  endY: number;
  isFull: boolean;
  isEmpty: boolean;
  largeArcFlag: 0 | 1;
  sweepFlag: 0 | 1;
}

/** Ułamek pozostałego czasu, przycięty do zakresu 0–1. */
export function remainingFraction(totalSeconds: number, secondsRemaining: number): number {
  if (totalSeconds <= 0) return 0;
  const clamped = Math.max(0, Math.min(totalSeconds, secondsRemaining));
  return clamped / totalSeconds;
}

/**
 * Ścieżka wycinka koła odpowiadającego pozostałemu czasu.
 *
 * Kierunek przeciwny do wskazówek zegara jest domyślny, bo tak działa
 * oryginalny Time Timer: ubywający kolor czyta się jako „tyle jeszcze mam".
 */
export function sectorPath(
  fraction: number,
  direction: DiscDirection = 'counter-clockwise',
  radius: number = DISC.radius
): SectorResult {
  const { cx, cy } = DISC;
  const f = Math.max(0, Math.min(1, fraction));

  const isFull = f >= 0.9999;
  const isEmpty = f <= 0.0001;

  if (isFull || isEmpty) {
    return {
      d: '',
      endX: cx,
      endY: cy - radius,
      isFull,
      isEmpty,
      largeArcFlag: 0,
      sweepFlag: direction === 'counter-clockwise' ? 0 : 1,
    };
  }

  const angleSpan = f * 2 * Math.PI;
  const counter = direction === 'counter-clockwise';
  const endX = counter ? cx - radius * Math.sin(angleSpan) : cx + radius * Math.sin(angleSpan);
  const endY = cy - radius * Math.cos(angleSpan);

  const largeArcFlag: 0 | 1 = f > 0.5 ? 1 : 0;
  const sweepFlag: 0 | 1 = counter ? 0 : 1;

  const d =
    `M ${cx} ${cy} L ${cx} ${cy - radius} ` +
    `A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX.toFixed(3)} ${endY.toFixed(3)} Z`;

  return { d, endX, endY, isFull, isEmpty, largeArcFlag, sweepFlag };
}

/** Kąt wskazówki w stopniach, gotowy do wstawienia w `rotate()`. */
export function pointerAngle(endX: number, endY: number): number {
  return (Math.atan2(endY - DISC.cy, endX - DISC.cx) * 180) / Math.PI + 90;
}

export interface Tick {
  id: string;
  index: number;
  isMajor: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Środek kreski — tam trafia kropka znacznika pięciominutowego. */
  dotX: number;
  dotY: number;
}

/** 60 kresek podziałki; co piąta jest główna. */
export function tickPositions(): Tick[] {
  const { cx, cy, tickOuterRadius, majorTickInnerRadius, minorTickInnerRadius } = DISC;

  return Array.from({ length: 60 }, (_, index) => {
    const isMajor = index % 5 === 0;
    const angle = -Math.PI / 2 + (index / 60) * 2 * Math.PI;
    const rInner = isMajor ? majorTickInnerRadius : minorTickInnerRadius;
    const rDot = (majorTickInnerRadius + tickOuterRadius) / 2;

    return {
      id: `tick-${index}`,
      index,
      isMajor,
      x1: cx + rInner * Math.cos(angle),
      y1: cy + rInner * Math.sin(angle),
      x2: cx + tickOuterRadius * Math.cos(angle),
      y2: cy + tickOuterRadius * Math.sin(angle),
      dotX: cx + rDot * Math.cos(angle),
      dotY: cy + rDot * Math.sin(angle),
    };
  });
}

export interface NumberPosition {
  value: number;
  x: number;
  y: number;
}

/** Pozycje cyfr 0–55; kierunek odwraca znak kąta. */
export function numberPositions(direction: DiscDirection = 'counter-clockwise'): NumberPosition[] {
  const { cx, cy, numbersRadius } = DISC;
  const sign = direction === 'counter-clockwise' ? -1 : 1;

  return NUMBERS_SERIES.map((value) => {
    const angle = -Math.PI / 2 + sign * (value / 60) * 2 * Math.PI;
    return {
      value,
      x: cx + numbersRadius * Math.cos(angle),
      y: cy + numbersRadius * Math.sin(angle),
    };
  });
}
