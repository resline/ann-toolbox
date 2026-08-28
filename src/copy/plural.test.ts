import { describe, it, expect } from 'vitest';
import { plCount, plWith } from './plural';

const ISKIERKA = ['iskierkę', 'iskierki', 'iskierek'] as const;
const KROK = ['krok', 'kroki', 'kroków'] as const;
const MINUTA = ['minuta', 'minuty', 'minut'] as const;

describe('plCount', () => {
  it.each([
    [0, 'iskierek'],
    [1, 'iskierkę'],
    [2, 'iskierki'],
    [3, 'iskierki'],
    [4, 'iskierki'],
    [5, 'iskierek'],
    [11, 'iskierek'],
    [12, 'iskierek'],
    [13, 'iskierek'],
    [14, 'iskierek'],
    [21, 'iskierek'],
    [22, 'iskierki'],
    [25, 'iskierek'],
    [102, 'iskierki'],
    [112, 'iskierek'],
  ])('%i → %s', (n, expected) => {
    expect(plCount(n, [...ISKIERKA])).toBe(expected);
  });

  it('obsługuje inne rodzaje', () => {
    expect(plCount(1, [...KROK])).toBe('krok');
    expect(plCount(3, [...KROK])).toBe('kroki');
    expect(plCount(7, [...KROK])).toBe('kroków');
    expect(plCount(1, [...MINUTA])).toBe('minuta');
    expect(plCount(22, [...MINUTA])).toBe('minuty');
  });

  it('plWith dokleja liczbę', () => {
    expect(plWith(5, [...ISKIERKA])).toBe('5 iskierek');
    expect(plWith(1, [...KROK])).toBe('1 krok');
  });
});
