import { describe, expect, it } from 'vitest';
import {
  VOICE_FRAGMENT_COUNT,
  VOICE_FRAGMENT_DEFINITIONS,
  VOICE_FRAGMENT_REGISTRY,
  assertPlanIsResolvable,
  planDepartureAnnouncement,
  planInteger,
  planTimeAnnouncement,
  resolveDepartureLabelId,
} from './polishAnnouncementPlanner';

describe('polishAnnouncementPlanner', () => {
  const renderedText = (fragmentIds: Array<{ id: string }>) =>
    fragmentIds.map((item) => VOICE_FRAGMENT_REGISTRY.get(item.id)?.text).join(' ');
  const normalize = (value: string) => value.toLocaleLowerCase('pl-PL').replace(/[.!:]/g, '').replace(/\s+/g, ' ').trim();

  it('publishes the exact unique immutable fragment registry', () => {
    expect(VOICE_FRAGMENT_DEFINITIONS).toHaveLength(VOICE_FRAGMENT_COUNT);
    expect(VOICE_FRAGMENT_REGISTRY.size).toBe(VOICE_FRAGMENT_COUNT);
    expect(new Set(VOICE_FRAGMENT_DEFINITIONS.map((item) => item.id)).size).toBe(
      VOICE_FRAGMENT_COUNT
    );
    for (const id of ['departure.minuty.cont', 'departure.minut.cont']) {
      expect(VOICE_FRAGMENT_REGISTRY.get(id)).toMatchObject({
        prosodyRole: 'medial-continuing',
        promptId: 'clock-medial-cont-v1',
      });
    }
  });

  it('uses feminine cardinal forms when the spoken unit is minuty', () => {
    const date = new Date(2026, 7, 29, 10, 7);
    const elapsedCases = [
      [1, 'Minęła jedna minuta Jest dziesiąta zero siedem'],
      [2, 'Minęły dwie minuty Jest dziesiąta zero siedem'],
      [21, 'Minęło dwadzieścia jeden minut Jest dziesiąta zero siedem'],
      [22, 'Minęły dwadzieścia dwie minuty Jest dziesiąta zero siedem'],
      [32, 'Minęły trzydzieści dwie minuty Jest dziesiąta zero siedem'],
      [102, 'Minęły sto dwie minuty Jest dziesiąta zero siedem'],
    ] as const;
    for (const [minutes, expected] of elapsedCases) {
      const plan = planTimeAnnouncement(date, 'elapsed', { elapsedMinutes: minutes });
      expect(renderedText(plan.fragments)).toBe(expected);
    }

    const departureCases = [
      [2, 'Za dwie minuty Spotkanie'],
      [12, 'Za dwanaście minut Spotkanie'],
      [22, 'Za dwadzieścia dwie minuty Spotkanie'],
      [32, 'Za trzydzieści dwie minuty Spotkanie'],
      [102, 'Za sto dwie minuty Spotkanie'],
    ] as const;
    for (const [minutes, expected] of departureCases) {
      const plan = planDepartureAnnouncement(minutes * 60, 'Spotkanie');
      expect(renderedText(plan.fragments)).toBe(expected);
    }
  });

  it('resolves every minute of a day for all clock styles', () => {
    for (const style of ['precise', 'natural', 'short', 'elapsed'] as const) {
      for (let minuteOfDay = 0; minuteOfDay < 24 * 60; minuteOfDay += 1) {
        const date = new Date(2026, 7, 29, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
        const plan = planTimeAnnouncement(date, style, { elapsedMinutes: minuteOfDay });
        expect(plan.fragments.length).toBeGreaterThan(0);
        expect(() => assertPlanIsResolvable(plan)).not.toThrow();
        if (style !== 'elapsed') {
          expect(normalize(renderedText(plan.fragments))).toBe(normalize(plan.text));
        }
      }
    }
  }, 15_000);

  it('keeps the special natural-time branches and contextual hour variants', () => {
    expect(planTimeAnnouncement(new Date(2026, 7, 29, 0, 0), 'natural').fragments).toEqual([
      { id: 'natural.midnight.final' },
    ]);
    expect(planTimeAnnouncement(new Date(2026, 7, 29, 12, 0), 'natural').fragments).toEqual([
      { id: 'natural.noon.final' },
    ]);
    expect(planTimeAnnouncement(new Date(2026, 7, 29, 10, 30), 'natural').fragments).toEqual([
      { id: 'natural.wpolDo.cont', joinAfter: 'neutral-word' },
      { id: 'hour.genitive.afterDo.final.11' },
    ]);
    expect(renderedText(planTimeAnnouncement(new Date(2026, 7, 29, 10, 22), 'natural').fragments))
      .toBe('Dwadzieścia dwie po dziesiątej');
    expect(renderedText(planTimeAnnouncement(new Date(2026, 7, 29, 10, 38), 'natural').fragments))
      .toBe('Za dwadzieścia dwie jedenasta');
  });

  it('composes non-negative safe integers across every supported scale', () => {
    const values = [
      0, 1, 2, 4, 5, 11, 12, 14, 19, 20, 21, 99, 100, 101, 999,
      1_000, 1_002, 12_000, 22_000, 112_000, 1_000_000,
      2_000_000, 5_000_000, 1_000_000_000, 1_000_000_000_000,
      Number.MAX_SAFE_INTEGER,
    ];
    for (const value of values) {
      const fragments = planInteger(value);
      expect(fragments.length).toBeGreaterThan(0);
      for (const fragment of fragments) {
        expect(VOICE_FRAGMENT_REGISTRY.has(fragment.id)).toBe(true);
      }
    }
    expect(() => planInteger(-1)).toThrow(RangeError);
    expect(() => planInteger(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });

  it('resolves departure announcements from zero through twelve hours for all labels', () => {
    const labels = [
      'Wyj\u015bcie z domu',
      'Spotkanie',
      'Poci\u0105g lub autobus',
      'Leki',
      'Gotowanie',
      'Przerwa',
      'W\u0142asna etykieta',
    ];
    const target = new Date(2026, 7, 29, 18, 0);
    for (const label of labels) {
      for (let minutes = 0; minutes <= 720; minutes += 1) {
        const plan = planDepartureAnnouncement(minutes * 60, label, target, minutes === 0);
        expect(() => assertPlanIsResolvable(plan)).not.toThrow();
      }
    }
  }, 15_000);

  it('maps a custom departure label to the disclosed generic recording', () => {
    expect(resolveDepartureLabelId('Spotkanie')).toBe('meeting');
    expect(resolveDepartureLabelId('Dentysta')).toBe('generic');
    const plan = planDepartureAnnouncement(5 * 60, 'Dentysta');
    expect(plan.usesGenericDepartureLabel).toBe(true);
    expect(plan.fragments.some((item) => item.id === 'departure.label.generic.countdown')).toBe(true);
    expect(plan.text).toContain('Dentysta');
  });
});
