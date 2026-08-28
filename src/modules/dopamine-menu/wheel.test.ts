import { describe, it, expect } from 'vitest';
import {
  HUB_RADIUS,
  WHEEL_MAX_LINES,
  WHEEL_SLICES,
  firstLineOffsetEm,
  landingRotation,
  maxCharsPerLine,
  sampleWithoutRepeats,
  sliceFill,
  sliceGeometry,
  textRadius,
  wrapRadial,
} from './wheel';
import { DEFAULT_DOPAMINE_MENU } from './presets';

const POOL = Array.from({ length: 20 }, (_, i) => `p-${i}`);

/** Wymiary koła takie, jakie rysuje arkusz — geometria musi zgadzać się z widokiem. */
const RADIUS = 150;
const CENTER = 160;

describe('sampleWithoutRepeats', () => {
  it('bierze najwyżej osiem pozycji', () => {
    expect(sampleWithoutRepeats(POOL)).toHaveLength(WHEEL_SLICES);
  });

  it('nie powtarza pozycji', () => {
    for (let run = 0; run < 50; run += 1) {
      const picked = sampleWithoutRepeats(POOL);
      expect(new Set(picked).size).toBe(picked.length);
    }
  });

  it('oddaje całą pulę, gdy jest mniejsza niż koło', () => {
    const small = ['a', 'b', 'c'];
    expect(sampleWithoutRepeats(small).sort()).toEqual(small);
  });

  it('nie rusza puli wejściowej', () => {
    const original = POOL.slice();
    sampleWithoutRepeats(POOL);
    expect(POOL).toEqual(original);
  });

  it('z deterministycznym losowaniem daje deterministyczny wynik', () => {
    const always = () => 0;
    expect(sampleWithoutRepeats(['a', 'b', 'c'], 2, always)).toEqual(['a', 'b']);
  });
});

describe('maxCharsPerLine', () => {
  it('zostawia napisowi tylko odcinek od krawędzi do piasty', () => {
    const chars = maxCharsPerLine(RADIUS);
    const longest = 'W'.repeat(chars).length;
    // szerokość najdłuższej dopuszczalnej linii nie może sięgnąć pod piastę
    expect(textRadius(RADIUS) - longest * 13 * 0.52).toBeGreaterThanOrEqual(HUB_RADIUS);
  });

  it('przy mniejszym kole daje krótszą linię', () => {
    expect(maxCharsPerLine(100)).toBeLessThan(maxCharsPerLine(RADIUS));
  });
});

describe('wrapRadial', () => {
  const MAX = maxCharsPerLine(RADIUS);

  it('zostawia krótką nazwę w jednej linii', () => {
    expect(wrapRadial('Zimna woda', MAX)).toEqual(['Zimna woda']);
  });

  it('nie zostawia pustych linii przy nadmiarze spacji', () => {
    expect(wrapRadial('  Zimna    woda  ', MAX)).toEqual(['Zimna woda']);
  });

  it('łamie długą nazwę po słowach, bez gubienia liter', () => {
    const lines = wrapRadial('Spacer po parku bez telefonu', MAX);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('Spacer po parku bez telefonu');
  });

  it('żadna linia nie jest dłuższa od budżetu', () => {
    for (const item of DEFAULT_DOPAMINE_MENU) {
      for (const line of wrapRadial(item.title, MAX)) {
        expect(line.length, item.title).toBeLessThanOrEqual(MAX);
      }
    }
  });

  it('nie daje więcej linii, niż mieści wycinek', () => {
    const lines = wrapRadial('Bardzo dluga nazwa ktora nie miesci sie w trzech liniach na kole', MAX);
    expect(lines).toHaveLength(WHEEL_MAX_LINES);
  });

  it('skraca dopiero to, czego nie da się złamać', () => {
    const lines = wrapRadial('Bardzo dluga nazwa ktora nie miesci sie w trzech liniach na kole', MAX);
    expect(lines[lines.length - 1].endsWith('…')).toBe(true);
  });

  it('dzieli słowo dłuższe niż cała linia', () => {
    const lines = wrapRadial('Nieprzezwyciezalnosciowoscia', 8);
    expect(lines[0]).toHaveLength(8);
  });

  it('pokazuje KAŻDY tytuł z karty dań w całości', () => {
    const cut = DEFAULT_DOPAMINE_MENU.filter((item) =>
      wrapRadial(item.title, MAX).some((line) => line.endsWith('…'))
    );
    expect(cut.map((item) => item.title)).toEqual([]);
  });
});

describe('firstLineOffsetEm', () => {
  it('trzyma blok napisu na osi wycinka', () => {
    // środek bloku: offset + (n-1)/2 wysokości linii — zawsze ten sam punkt
    for (const lines of [1, 2, 3]) {
      expect(firstLineOffsetEm(lines) + ((lines - 1) * 1.15) / 2).toBeCloseTo(0.35, 5);
    }
  });
});

describe('sliceGeometry', () => {
  it('pierwszy wycinek celuje w zero stopni', () => {
    expect(sliceGeometry(0, 8, CENTER, RADIUS).angle).toBe(0);
  });

  it('rozkłada wycinki równomiernie', () => {
    expect(sliceGeometry(4, 8, CENTER, RADIUS).angle).toBe(180);
  });

  it('zaczepia napis przy krawędzi, nie w środku', () => {
    const { textX, textY } = sliceGeometry(0, 8, CENTER, RADIUS);
    expect(textX).toBeCloseTo(CENTER + textRadius(RADIUS), 5);
    expect(textY).toBeCloseTo(CENTER, 5);
  });

  it('domyka ścieżkę wycinka', () => {
    expect(sliceGeometry(2, 8, CENTER, RADIUS).path.endsWith('Z')).toBe(true);
  });

  it('obraca napisy z lewej połowy, żeby nie stały na głowie', () => {
    const right = sliceGeometry(1, 8, CENTER, RADIUS);
    expect(right.textRotation).toBe(45);
    expect(right.textAnchor).toBe('end');

    const left = sliceGeometry(5, 8, CENTER, RADIUS);
    expect(left.textRotation).toBe(225 + 180);
    expect(left.textAnchor).toBe('start');
  });
});

describe('sliceFill', () => {
  it('różnicuje wycinki jasnością jednego akcentu', () => {
    const fills = Array.from({ length: 8 }, (_, i) => sliceFill(i, 8));
    expect(new Set(fills).size).toBe(8);
    for (const fill of fills) expect(fill).toContain('var(--module)');
  });

  it('ostatni wycinek jest ciemniejszy od pierwszego', () => {
    const alpha = (fill: string) => Number(fill.replace(/[^\d.]/g, '').replace(/^0*/, '0'));
    expect(alpha(sliceFill(7, 8))).toBeGreaterThan(alpha(sliceFill(0, 8)));
  });
});

describe('landingRotation', () => {
  it('zatrzymuje wskaźnik na wybranym wycinku', () => {
    expect(landingRotation(0, 8, 5)).toBe(1800);
    expect(landingRotation(2, 8, 5) % 360).toBe(270);
  });
});
