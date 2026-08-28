/**
 * Geometria i dobór pozycji dla koła energii.
 *
 * Wcześniej koło pokazywało wszystkie przefiltrowane pozycje — przy dwudziestu
 * siedmiu wycinkach napis skracał się do ośmiu znaków przy 8 px, więc ekran,
 * na którym trzeba przeczytać JEDNO słowo, był nieczytelny. Ośmioelementowa
 * próbka bez powtórzeń jest statystycznie tym samym losowaniem, a wizualnie
 * daje się przeczytać.
 */

/** Więcej wycinków nie mieści czytelnego napisu na kole tej wielkości. */
export const WHEEL_SLICES = 8;

/** Rozmiar napisu na kole, w jednostkach viewBoxa. */
export const WHEEL_FONT_SIZE = 13;

/** Trzy linie to granica: przy czterech wycinek robi się ścianą tekstu. */
export const WHEEL_MAX_LINES = 3;

/**
 * Promień nieprzezroczystej piasty rysowanej NAD kołem. Napis, który tu wejdzie,
 * jest po prostu zasłonięty — dlatego długość linii liczymy, a nie zgadujemy.
 */
export const HUB_RADIUS = 30;

/** Prześwit między końcem najdłuższej linii a piastą. */
const HUB_CLEARANCE = 6;

/** Średnia szerokość znaku w em dla kroju interfejsu — z zapasem na „mż". */
const CHAR_WIDTH_EM = 0.52;

/** Losowanie wstrzykiwane, żeby test mógł być deterministyczny. */
export type RandomFn = () => number;

/**
 * Próbka bez powtórzeń — tasowanie Fishera–Yatesa przerwane po `size` krokach.
 */
export function sampleWithoutRepeats<T>(
  pool: readonly T[],
  size: number = WHEEL_SLICES,
  random: RandomFn = Math.random
): T[] {
  const rest = pool.slice();
  const take = Math.min(size, rest.length);
  const picked: T[] = [];

  for (let i = 0; i < take; i += 1) {
    const index = i + Math.floor(random() * (rest.length - i));
    const swap = rest[index];
    rest[index] = rest[i];
    rest[i] = swap;
    picked.push(swap);
  }

  return picked;
}

/** Promień, na którym zaczepiony jest napis — tuż przy krawędzi wycinka. */
export function textRadius(radius: number): number {
  return radius * 0.9;
}

/**
 * Ile znaków zmieści się w jednej linii, zanim wejdzie pod piastę.
 *
 * Napis biegnie od krawędzi w stronę środka, więc jego długość jest ograniczona
 * odcinkiem `textRadius − HUB_RADIUS`. Wcześniej stała była wpisana ręcznie (20)
 * i najdłuższe linie chowały pierwsze znaki pod piastą.
 */
export function maxCharsPerLine(radius: number, fontSize: number = WHEEL_FONT_SIZE): number {
  const available = textRadius(radius) - HUB_RADIUS - HUB_CLEARANCE;
  return Math.max(6, Math.floor(available / (fontSize * CHAR_WIDTH_EM)));
}

/**
 * Łamie nazwę na linie promieniste — najwyżej `maxLines`.
 *
 * Skracamy dopiero wtedy, gdy nazwa nie mieści się w całym kadrze; presety są
 * pisane tak, żeby nigdy do tego nie doszło (pilnuje tego wheel.test.ts).
 */
export function wrapRadial(
  title: string,
  maxPerLine: number,
  maxLines: number = WHEEL_MAX_LINES
): string[] {
  const clean = title.trim().replace(/\s+/g, ' ');
  if (!clean) return [];
  if (clean.length <= maxPerLine) return [clean];

  // Słowo dłuższe niż linia (nazwa własna, sklejenie) dzielimy na kawałki —
  // inaczej zjadłoby całą linię i wymusiło wielokropek.
  const words: string[] = [];
  for (const word of clean.split(' ')) {
    let rest = word;
    while (rest.length > maxPerLine) {
      words.push(rest.slice(0, maxPerLine));
      rest = rest.slice(maxPerLine);
    }
    if (rest) words.push(rest);
  }

  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxPerLine) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] =
    last.length < maxPerLine ? `${last}…` : `${last.slice(0, maxPerLine - 1).trimEnd()}…`;
  return kept;
}

export interface WheelGeometry {
  /** Ścieżka wycinka. */
  path: string;
  /** Kąt środka wycinka w stopniach — po nim biegnie napis. */
  angle: number;
  /** Punkt zaczepienia napisu przy krawędzi. */
  textX: number;
  textY: number;
  /**
   * Obrót napisu. Lewa połowa koła dostaje dodatkowe 180°, inaczej nazwy
   * stałyby na głowie — a to jest ekran, na którym trzeba przeczytać jedno
   * słowo, nie odgadnąć je.
   */
  textRotation: number;
  /** Zaczep napisu: przy krawędzi, w stronę środka. */
  textAnchor: 'start' | 'end';
}

/**
 * Wycinek numer `index` z `count`. Zero stopni pokazuje w górę, bo całe koło
 * jest obrócone o -90° — dzięki temu wskaźnik nad kołem trafia w wycinek 0.
 */
export function sliceGeometry(
  index: number,
  count: number,
  center: number,
  radius: number
): WheelGeometry {
  const sliceAngle = 360 / count;
  const angle = index * sliceAngle;
  const rad = (deg: number) => (deg * Math.PI) / 180;

  const start = rad(angle - sliceAngle / 2);
  const end = rad(angle + sliceAngle / 2);

  const x1 = center + radius * Math.cos(start);
  const y1 = center + radius * Math.sin(start);
  const x2 = center + radius * Math.cos(end);
  const y2 = center + radius * Math.sin(end);

  const largeArc = sliceAngle > 180 ? 1 : 0;
  const path =
    count === 1
      ? `M ${center},${center - radius} A ${radius},${radius} 0 1,1 ${center},${center + radius} A ${radius},${radius} 0 1,1 ${center},${center - radius} Z`
      : `M ${center},${center} L ${x1.toFixed(2)},${y1.toFixed(2)} A ${radius},${radius} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;

  const anchorRadius = textRadius(radius);
  // Całe koło jest obrócone o -90°, więc na głowie stoją wycinki z kątem 180–360°.
  const flipped = angle >= 180 && angle < 360;

  return {
    path,
    angle,
    textX: center + anchorRadius * Math.cos(rad(angle)),
    textY: center + anchorRadius * Math.sin(rad(angle)),
    textRotation: flipped ? angle + 180 : angle,
    textAnchor: flipped ? 'start' : 'end',
  };
}

/**
 * Pionowe przesunięcie pierwszej linii, żeby blok napisu stał na osi wycinka.
 * Kolejne linie idą co `LINE_HEIGHT_EM`.
 */
export const LINE_HEIGHT_EM = 1.15;

export function firstLineOffsetEm(lineCount: number): number {
  return Number((0.35 - ((lineCount - 1) * LINE_HEIGHT_EM) / 2).toFixed(3));
}

/**
 * Osiem stopni JEDNEGO akcentu — różnicujemy jasnością, nie barwą.
 * Alfa idzie na tle powierzchni, więc napis zachowuje kontrast na każdym z nich.
 */
export function sliceFill(index: number, count: number): string {
  const step = count > 1 ? index / (count - 1) : 0;
  const alpha = (0.07 + step * 0.25).toFixed(3);
  return `rgb(var(--module) / ${alpha})`;
}

/** Obrót koła tak, żeby wskaźnik nad nim zatrzymał się na wycinku `index`. */
export function landingRotation(index: number, count: number, turns: number): number {
  return turns * 360 - index * (360 / count);
}
