import { describe, it, expect } from 'vitest';
import { formatDuration } from './formatDuration';

/**
 * Ta funkcja zastąpiła dwie kopie w modułach „Czas" i „Skupienie", więc test
 * pilnuje przede wszystkim zgodności z tym, co obie pokazywały do tej pory.
 */
describe('formatDuration', () => {
  it('zero pokazuje jako pełne MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('sekundy poniżej minuty uzupełnia zerami', () => {
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(59)).toBe('00:59');
  });

  it('minuty liczy bez godzin', () => {
    expect(formatDuration(60)).toBe('01:00');
    expect(formatDuration(90)).toBe('01:30');
    expect(formatDuration(25 * 60)).toBe('25:00');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('godziny dokłada dopiero po przekroczeniu pełnej godziny', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(10 * 3600 + 5 * 60 + 9)).toBe('10:05:09');
  });

  it('wartości ujemne zbija do zera zamiast pokazywać minus', () => {
    expect(formatDuration(-1)).toBe('00:00');
    expect(formatDuration(-3600)).toBe('00:00');
  });

  it('ułamki sekundy obcina w dół', () => {
    expect(formatDuration(59.9)).toBe('00:59');
    expect(formatDuration(0.4)).toBe('00:00');
  });

  it('wartości spoza zakresu liczb traktuje jak zero', () => {
    expect(formatDuration(Number.NaN)).toBe('00:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('00:00');
  });
});
