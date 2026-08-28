import { describe, it, expect } from 'vitest';
import {
  DISC,
  NUMBERS_SERIES,
  numberPositions,
  pointerAngle,
  remainingFraction,
  sectorPath,
  tickPositions,
} from './discGeometry';

/**
 * Te asercje sprawdzały wcześniej atrybut `d` regexpem i wewnętrzne klasy CSS,
 * przez co trzymały się szczegółu implementacyjnego. Tutaj sprawdzają liczby —
 * ta sama wiedza, ale przeżywa dowolną zmianę wyglądu tarczy.
 */

const dist = (x: number, y: number) => Math.hypot(x - DISC.cx, y - DISC.cy);

describe('remainingFraction', () => {
  it('zwraca 1 dla pełnego czasu i 0 dla zera', () => {
    expect(remainingFraction(600, 600)).toBe(1);
    expect(remainingFraction(600, 0)).toBe(0);
  });

  it('przycina wartości spoza zakresu', () => {
    expect(remainingFraction(600, 900)).toBe(1);
    expect(remainingFraction(600, -100)).toBe(0);
  });

  it('zwraca 0 przy zerowym lub ujemnym czasie całkowitym', () => {
    expect(remainingFraction(0, 10)).toBe(0);
    expect(remainingFraction(-5, 10)).toBe(0);
  });
});

describe('sectorPath', () => {
  it('pełny sektor nie rysuje ścieżki', () => {
    const r = sectorPath(1);
    expect(r.isFull).toBe(true);
    expect(r.isEmpty).toBe(false);
    expect(r.d).toBe('');
  });

  it('pusty sektor nie rysuje ścieżki', () => {
    const r = sectorPath(0);
    expect(r.isEmpty).toBe(true);
    expect(r.d).toBe('');
  });

  it('dla części koła zwraca ścieżkę z łukiem', () => {
    const r = sectorPath(0.25);
    expect(r.d).toMatch(/^M 150 150 L 150 38 A 112 112 0 /);
    expect(r.d.endsWith('Z')).toBe(true);
  });

  it('largeArcFlag przełącza się powyżej połowy', () => {
    expect(sectorPath(0.25).largeArcFlag).toBe(0);
    expect(sectorPath(0.5).largeArcFlag).toBe(0);
    expect(sectorPath(0.51).largeArcFlag).toBe(1);
    expect(sectorPath(0.99).largeArcFlag).toBe(1);
  });

  it('sweepFlag zależy od kierunku tarczy', () => {
    expect(sectorPath(0.3, 'counter-clockwise').sweepFlag).toBe(0);
    expect(sectorPath(0.3, 'clockwise').sweepFlag).toBe(1);
  });

  it('kierunki są lustrzane względem osi pionowej', () => {
    const ccw = sectorPath(0.25, 'counter-clockwise');
    const cw = sectorPath(0.25, 'clockwise');
    expect(ccw.endX).toBeCloseTo(2 * DISC.cx - cw.endX, 6);
    expect(ccw.endY).toBeCloseTo(cw.endY, 6);
  });

  it('koniec łuku leży na okręgu tarczy', () => {
    for (const f of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const r = sectorPath(f);
      expect(dist(r.endX, r.endY)).toBeCloseTo(DISC.radius, 6);
    }
  });

  it('ćwierć obrotu przeciwnie do wskazówek kończy się po lewej stronie', () => {
    const r = sectorPath(0.25, 'counter-clockwise');
    expect(r.endX).toBeCloseTo(DISC.cx - DISC.radius, 6);
    expect(r.endY).toBeCloseTo(DISC.cy, 6);
  });

  it('przycina ułamek spoza zakresu zamiast rysować bzdury', () => {
    expect(sectorPath(1.5).isFull).toBe(true);
    expect(sectorPath(-0.2).isEmpty).toBe(true);
  });
});

describe('pointerAngle', () => {
  it('wskazuje w górę przy pełnej tarczy', () => {
    const r = sectorPath(1);
    expect(pointerAngle(r.endX, r.endY)).toBeCloseTo(0, 6);
  });

  it('obraca się wraz z końcem łuku', () => {
    // atan2 daje zakres (-180, 180], po dodaniu 90 wychodzi (-90, 270];
    // ćwierć obrotu w lewo to 270°, czyli ten sam kierunek co -90°
    const quarter = sectorPath(0.25, 'counter-clockwise');
    expect(pointerAngle(quarter.endX, quarter.endY)).toBeCloseTo(270, 6);
  });
});

describe('tickPositions', () => {
  it('daje 60 kresek, z czego 12 głównych', () => {
    const ticks = tickPositions();
    expect(ticks).toHaveLength(60);
    expect(ticks.filter((t) => t.isMajor)).toHaveLength(12);
  });

  it('kreska główna wypada co pięć minut', () => {
    for (const tick of tickPositions()) {
      expect(tick.isMajor).toBe(tick.index % 5 === 0);
    }
  });

  it('pierwsza kreska jest na godzinie dwunastej', () => {
    const [first] = tickPositions();
    expect(first.x2).toBeCloseTo(DISC.cx, 6);
    expect(first.y2).toBeCloseTo(DISC.cy - DISC.tickOuterRadius, 6);
  });

  it('kreski główne sięgają głębiej niż pomocnicze', () => {
    const ticks = tickPositions();
    const major = ticks.find((t) => t.isMajor)!;
    const minor = ticks.find((t) => !t.isMajor)!;
    expect(dist(major.x1, major.y1)).toBeLessThan(dist(minor.x1, minor.y1));
  });

  it('identyfikatory są unikalne', () => {
    const ids = tickPositions().map((t) => t.id);
    expect(new Set(ids).size).toBe(60);
  });
});

describe('numberPositions', () => {
  it('daje dwanaście cyfr serii Time Timera', () => {
    const nums = numberPositions();
    expect(nums).toHaveLength(12);
    expect(nums.map((n) => n.value)).toEqual([...NUMBERS_SERIES]);
  });

  it('zero jest na górze tarczy', () => {
    const zero = numberPositions().find((n) => n.value === 0)!;
    expect(zero.x).toBeCloseTo(DISC.cx, 6);
    expect(zero.y).toBeCloseTo(DISC.cy - DISC.numbersRadius, 6);
  });

  it('trzydziestka jest naprzeciwko zera', () => {
    const thirty = numberPositions().find((n) => n.value === 30)!;
    expect(thirty.x).toBeCloseTo(DISC.cx, 6);
    expect(thirty.y).toBeCloseTo(DISC.cy + DISC.numbersRadius, 6);
  });

  it('kierunek odbija cyfry względem osi pionowej', () => {
    const ccw = numberPositions('counter-clockwise').find((n) => n.value === 15)!;
    const cw = numberPositions('clockwise').find((n) => n.value === 15)!;
    expect(ccw.x).toBeCloseTo(2 * DISC.cx - cw.x, 6);
    expect(ccw.y).toBeCloseTo(cw.y, 6);
  });

  it('wszystkie cyfry leżą na jednym okręgu', () => {
    for (const n of numberPositions()) {
      expect(dist(n.x, n.y)).toBeCloseTo(DISC.numbersRadius, 6);
    }
  });
});
