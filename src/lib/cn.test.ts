import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('rozstrzyga konflikt własnych promieni', () => {
    expect(cn('rounded-card', 'rounded-sheet')).toBe('rounded-sheet');
  });

  it('własny promień koliduje z wbudowanym', () => {
    expect(cn('rounded-xl', 'rounded-card')).toBe('rounded-card');
  });

  it('rozstrzyga konflikt cieni', () => {
    expect(cn('shadow-sm', 'shadow-hairline')).toBe('shadow-hairline');
  });

  it('rozstrzyga konflikt rozmiaru tekstu', () => {
    expect(cn('text-sm', 'text-display-2')).toBe('text-display-2');
  });

  it('obsługuje warunki tak jak clsx', () => {
    expect(cn('a', false && 'b', ['c'], { d: true, e: false })).toBe('a c d');
  });

  it('nie psuje zwykłego rozstrzygania twMerge', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
