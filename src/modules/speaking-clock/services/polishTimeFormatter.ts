export type TimeFormatStyle = 'precise' | 'natural' | 'short' | 'elapsed';

export interface FormatOptions {
  elapsedMinutes?: number;
  isSessionEnd?: boolean;
}

const HOURS_NOMINATIVE: Record<number, string> = {
  0: 'zero',
  1: 'pierwsza',
  2: 'druga',
  3: 'trzecia',
  4: 'czwarta',
  5: 'piąta',
  6: 'szósta',
  7: 'siódma',
  8: 'ósma',
  9: 'dziewiąta',
  10: 'dziesiąta',
  11: 'jedenasta',
  12: 'dwunasta',
  13: 'trzynasta',
  14: 'czternasta',
  15: 'piętnasta',
  16: 'szesnasta',
  17: 'siedemnasta',
  18: 'osiemnasta',
  19: 'dziewiętnasta',
  20: 'dwudziesta',
  21: 'dwudziesta pierwsza',
  22: 'dwudziesta druga',
  23: 'dwudziesta trzecia',
};

const HOURS_GENITIVE: Record<number, string> = {
  0: 'północy',
  1: 'pierwszej',
  2: 'drugiej',
  3: 'trzeciej',
  4: 'czwartej',
  5: 'piątej',
  6: 'szóstej',
  7: 'siódmej',
  8: 'ósmej',
  9: 'dziewiątej',
  10: 'dziesiątej',
  11: 'jedenastej',
  12: 'dwunastej',
  13: 'trzynastej',
  14: 'czternastej',
  15: 'piętnastej',
  16: 'szesnastej',
  17: 'siedemnastej',
  18: 'osiemnastej',
  19: 'dziewiętnastej',
  20: 'dwudziestej',
  21: 'dwudziestej pierwszej',
  22: 'dwudziestej drugiej',
  23: 'dwudziestej trzeciej',
};

const MINUTES_WORDS: Record<number, string> = {
  0: 'zero zero',
  1: 'zero jeden',
  2: 'zero dwa',
  3: 'zero trzy',
  4: 'zero cztery',
  5: 'zero pięć',
  6: 'zero sześć',
  7: 'zero siedem',
  8: 'zero osiem',
  9: 'zero dziewięć',
  10: 'dziesięć',
  11: 'jedenaście',
  12: 'dwanaście',
  13: 'trzynaście',
  14: 'czternaście',
  15: 'piętnaście',
  16: 'szesnaście',
  17: 'siedemnaście',
  18: 'osiemnaście',
  19: 'dziewiętnaście',
  20: 'dwadzieścia',
  21: 'dwadzieścia jeden',
  22: 'dwadzieścia dwa',
  23: 'dwadzieścia trzy',
  24: 'dwadzieścia cztery',
  25: 'dwadzieścia pięć',
  26: 'dwadzieścia sześć',
  27: 'dwadzieścia siedem',
  28: 'dwadzieścia osiem',
  29: 'dwadzieścia dziewięć',
  30: 'trzydzieści',
  31: 'trzydzieści jeden',
  32: 'trzydzieści dwa',
  33: 'trzydzieści trzy',
  34: 'trzydzieści cztery',
  35: 'trzydzieści pięć',
  36: 'trzydzieści sześć',
  37: 'trzydzieści siedem',
  38: 'trzydzieści osiem',
  39: 'trzydzieści dziewięć',
  40: 'czterdzieści',
  41: 'czterdzieści jeden',
  42: 'czterdzieści dwa',
  43: 'czterdzieści trzy',
  44: 'czterdzieści cztery',
  45: 'czterdzieści pięć',
  46: 'czterdzieści sześć',
  47: 'czterdzieści siedem',
  48: 'czterdzieści osiem',
  49: 'czterdzieści dziewięć',
  50: 'pięćdziesiąt',
  51: 'pięćdziesiąt jeden',
  52: 'pięćdziesiąt dwa',
  53: 'pięćdziesiąt trzy',
  54: 'pięćdziesiąt cztery',
  55: 'pięćdziesiąt pięć',
  56: 'pięćdziesiąt sześć',
  57: 'pięćdziesiąt siedem',
  58: 'pięćdziesiąt osiem',
  59: 'pięćdziesiąt dziewięć',
};

const NATURAL_MINUTES_AFTER: Record<number, string> = {
  1: 'Jedna minuta po',
  2: 'Dwie po',
  3: 'Trzy po',
  4: 'Cztery po',
  5: 'Pięć po',
  6: 'Sześć po',
  7: 'Siedem po',
  8: 'Osiem po',
  9: 'Dziewięć po',
  10: 'Dziesięć po',
  11: 'Jedenaście po',
  12: 'Dwanaście po',
  13: 'Trzynaście po',
  14: 'Czternaście po',
  15: 'Piętnaście po',
  16: 'Szesnaście po',
  17: 'Siedemnaście po',
  18: 'Osiemnaście po',
  19: 'Dziewiętnaście po',
  20: 'Dwadzieścia po',
  21: 'Dwadzieścia jeden po',
  22: 'Dwadzieścia dwa po',
  23: 'Dwadzieścia trzy po',
  24: 'Dwadzieścia cztery po',
  25: 'Dwadzieścia pięć po',
  26: 'Dwadzieścia sześć po',
  27: 'Dwadzieścia siedem po',
  28: 'Dwadzieścia osiem po',
  29: 'Dwadzieścia dziewięć po',
};

const NATURAL_MINUTES_BEFORE: Record<number, string> = {
  1: 'Za jedną minutę',
  2: 'Za dwie',
  3: 'Za trzy',
  4: 'Za cztery',
  5: 'Za pięć',
  6: 'Za sześć',
  7: 'Za siedem',
  8: 'Za osiem',
  9: 'Za dziewięć',
  10: 'Za dziesięć',
  11: 'Za jedenaście',
  12: 'Za dwanaście',
  13: 'Za trzynaście',
  14: 'Za czternaście',
  15: 'Za piętnaście',
  16: 'Za szesnaście',
  17: 'Za siedemnaście',
  18: 'Za osiemnaście',
  19: 'Za dziewiętnaście',
  20: 'Za dwadzieścia',
  21: 'Za dwadzieścia jeden',
  22: 'Za dwadzieścia dwa',
  23: 'Za dwadzieścia trzy',
  24: 'Za dwadzieścia cztery',
  25: 'Za dwadzieścia pięć',
  26: 'Za dwadzieścia sześć',
  27: 'Za dwadzieścia siedem',
  28: 'Za dwadzieścia osiem',
  29: 'Za dwadzieścia dziewięć',
};

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getHourInWords(
  hour: number,
  caseType: 'nominative' | 'genitive' | 'locative' = 'nominative'
): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  if (caseType === 'genitive' || caseType === 'locative') {
    return HOURS_GENITIVE[normalizedHour];
  }
  return HOURS_NOMINATIVE[normalizedHour];
}

export function getMinuteInWords(minute: number): string {
  const normalizedMinute = ((minute % 60) + 60) % 60;
  return MINUTES_WORDS[normalizedMinute];
}

export function getDeclinedMinutes(count: number): {
  verb: string;
  count: number;
  noun: string;
  phrase: string;
} {
  let verb = 'Minęło';
  let noun = 'minut';

  if (count === 1) {
    verb = 'Minęła';
    noun = 'minuta';
  } else {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
      verb = 'Minęły';
      noun = 'minuty';
    } else {
      verb = 'Minęło';
      noun = 'minut';
    }
  }

  return {
    verb,
    count,
    noun,
    phrase: `${verb} ${count} ${noun}`,
  };
}

function formatPreciseTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  if (h === 0 && m === 0) {
    return 'Jest godzina zero zero';
  }
  const hourWord = HOURS_NOMINATIVE[h];
  const minuteWord = MINUTES_WORDS[m];
  return `Jest godzina ${hourWord} ${minuteWord}`;
}

function formatNaturalTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();

  // Full hour
  if (m === 0) {
    if (h === 12) return 'Dwunasta w południe';
    if (h === 0) return 'Północ';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return capitalize(HOURS_NOMINATIVE[h12]);
  }

  // 12-hour base for natural colloquial time
  const currentH12 = h % 12 === 0 ? 12 : h % 12;
  const nextH12 = (h % 12) + 1;

  // Quarter past (:15)
  if (m === 15) {
    return `Piętnaście po ${HOURS_GENITIVE[currentH12]}`;
  }

  // Half past (:30) -> "Wpół do [nextH12]"
  if (m === 30) {
    return `Wpół do ${HOURS_GENITIVE[nextH12]}`;
  }

  // Quarter to (:45) -> "Za piętnaście [nextH12]"
  if (m === 45) {
    return `Za piętnaście ${HOURS_NOMINATIVE[nextH12]}`;
  }

  // 1..29 (excluding 15)
  if (m > 0 && m < 30) {
    const prefix = NATURAL_MINUTES_AFTER[m];
    return `${prefix} ${HOURS_GENITIVE[currentH12]}`;
  }

  // 31..59 (excluding 45)
  const remaining = 60 - m;
  const prefix = NATURAL_MINUTES_BEFORE[remaining];
  return `${prefix} ${HOURS_NOMINATIVE[nextH12]}`;
}

function formatShortTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const hourWord = capitalize(HOURS_NOMINATIVE[h]);
  if (m === 0) {
    return hourWord;
  }
  const minuteWord = MINUTES_WORDS[m];
  return `${hourWord} ${minuteWord}`;
}

export function formatElapsedAnnouncement(
  elapsedMinutes: number,
  currentTime: Date,
  isSessionEnd?: boolean
): string {
  const hoursStr = String(currentTime.getHours()).padStart(2, '0');
  const minutesStr = String(currentTime.getMinutes()).padStart(2, '0');
  const timeStr = `${hoursStr}:${minutesStr}`;

  if (isSessionEnd) {
    return `Czas sesji minął! Jest ${timeStr}.`;
  }

  const { verb, noun } = getDeclinedMinutes(elapsedMinutes);
  return `${verb} ${elapsedMinutes} ${noun}. Jest ${timeStr}`;
}

export function formatPolishTime(
  date: Date,
  style: TimeFormatStyle,
  options?: FormatOptions
): string {
  switch (style) {
    case 'precise':
      return formatPreciseTime(date);
    case 'natural':
      return formatNaturalTime(date);
    case 'short':
      return formatShortTime(date);
    case 'elapsed':
      return formatElapsedAnnouncement(
        options?.elapsedMinutes ?? 0,
        date,
        options?.isSessionEnd
      );
    default:
      return formatPreciseTime(date);
  }
}

function getCountdownMinutePhrase(minutes: number): string {
  if (minutes === 1) {
    return 'Za minutę';
  }
  const mod10 = minutes % 10;
  const mod100 = minutes % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `Za ${minutes} minuty`;
  }
  return `Za ${minutes} minut`;
}

export function formatDepartureAnnouncement(
  remainingSeconds: number,
  label: string,
  targetTime?: Date,
  isDone?: boolean
): string {
  if (isDone || remainingSeconds <= 0) {
    if (targetTime) {
      const hoursStr = String(targetTime.getHours()).padStart(2, '0');
      const minutesStr = String(targetTime.getMinutes()).padStart(2, '0');
      return `Czas na: ${label}! Jest ${hoursStr}:${minutesStr}.`;
    }
    return `Czas na: ${label}!`;
  }

  if (remainingSeconds < 60) {
    if (remainingSeconds <= 30) {
      return `Za pół minuty: ${label}.`;
    }
    return `Mniej niż minuta do: ${label}.`;
  }

  const minutes = Math.round(remainingSeconds / 60);
  const phrase = getCountdownMinutePhrase(minutes);

  if (targetTime && remainingSeconds >= 900) {
    const currentTime = new Date(targetTime.getTime() - remainingSeconds * 1000);
    const hoursStr = String(currentTime.getHours()).padStart(2, '0');
    const minutesStr = String(currentTime.getMinutes()).padStart(2, '0');
    return `${phrase}: ${label}. Jest ${hoursStr}:${minutesStr}.`;
  }

  return `${phrase}: ${label}.`;
}
