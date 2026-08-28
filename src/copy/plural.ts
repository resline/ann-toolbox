/**
 * Polska odmiana przez liczbę.
 *
 * Zastępuje doraźne wyrażenia w komponentach — jedno z nich dawało
 * „5 iskierk" dla n ≥ 5 i „22 iskierk" dla 22.
 */
export type PluralForms = [one: string, few: string, many: string];

export function plCount(n: number, [one, few, many]: PluralForms): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const lastDigit = abs % 10;
  const lastTwo = abs % 100;
  const isFew = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return isFew ? few : many;
}

/** Liczba wraz z odmienionym rzeczownikiem, np. „5 iskierek". */
export function plWith(n: number, forms: PluralForms): string {
  return `${n} ${plCount(n, forms)}`;
}
