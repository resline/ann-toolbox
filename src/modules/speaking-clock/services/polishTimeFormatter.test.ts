import { describe, it, expect } from 'vitest';
import {
  formatPolishTime,
  formatElapsedAnnouncement,
  formatDepartureAnnouncement,
  getHourInWords,
  getMinuteInWords,
  getDeclinedMinutes,
  type TimeFormatStyle,
} from './polishTimeFormatter';

function createDate(hours: number, minutes: number): Date {
  const d = new Date(2026, 7, 27, hours, minutes, 0, 0);
  return d;
}

describe('polishTimeFormatter', () => {
  describe('precise style (Precyzyjny)', () => {
    it('formats 12:00 as "Jest godzina dwunasta zero zero"', () => {
      expect(formatPolishTime(createDate(12, 0), 'precise')).toBe(
        'Jest godzina dwunasta zero zero'
      );
    });

    it('formats 14:15 as "Jest godzina czternasta piętnaście"', () => {
      expect(formatPolishTime(createDate(14, 15), 'precise')).toBe(
        'Jest godzina czternasta piętnaście'
      );
    });

    it('formats 01:15 as "Jest godzina pierwsza piętnaście"', () => {
      expect(formatPolishTime(createDate(1, 15), 'precise')).toBe(
        'Jest godzina pierwsza piętnaście'
      );
    });

    it('formats 00:09 as "Jest godzina zero zero dziewięć"', () => {
      expect(formatPolishTime(createDate(0, 9), 'precise')).toBe(
        'Jest godzina zero zero dziewięć'
      );
    });

    it('formats 08:05 as "Jest godzina ósma zero pięć"', () => {
      expect(formatPolishTime(createDate(8, 5), 'precise')).toBe(
        'Jest godzina ósma zero pięć'
      );
    });

    it('formats 08:45 as "Jest godzina ósma czterdzieści pięć"', () => {
      expect(formatPolishTime(createDate(8, 45), 'precise')).toBe(
        'Jest godzina ósma czterdzieści pięć'
      );
    });

    it('formats 17:30 as "Jest godzina siedemnasta trzydzieści"', () => {
      expect(formatPolishTime(createDate(17, 30), 'precise')).toBe(
        'Jest godzina siedemnasta trzydzieści'
      );
    });

    it('formats 21:30 as "Jest godzina dwudziesta pierwsza trzydzieści"', () => {
      expect(formatPolishTime(createDate(21, 30), 'precise')).toBe(
        'Jest godzina dwudziesta pierwsza trzydzieści'
      );
    });

    it('formats midnight 00:00 as "Jest godzina zero zero"', () => {
      expect(formatPolishTime(createDate(0, 0), 'precise')).toBe(
        'Jest godzina zero zero'
      );
    });

    it('formats 01:01 as "Jest godzina pierwsza zero jeden"', () => {
      expect(formatPolishTime(createDate(1, 1), 'precise')).toBe(
        'Jest godzina pierwsza zero jeden'
      );
    });

    it('formats 23:59 as "Jest godzina dwudziesta trzecia pięćdziesiąt dziewięć"', () => {
      expect(formatPolishTime(createDate(23, 59), 'precise')).toBe(
        'Jest godzina dwudziesta trzecia pięćdziesiąt dziewięć'
      );
    });
  });

  describe('natural style (Naturalny / Potoczny)', () => {
    describe('full hours (m === 0)', () => {
      it('formats 12:00 as "Dwunasta w południe"', () => {
        expect(formatPolishTime(createDate(12, 0), 'natural')).toBe(
          'Dwunasta w południe'
        );
      });

      it('formats 00:00 as "Północ"', () => {
        expect(formatPolishTime(createDate(0, 0), 'natural')).toBe('Północ');
      });

      it('formats 01:00 and 13:00 as "Pierwsza"', () => {
        expect(formatPolishTime(createDate(1, 0), 'natural')).toBe('Pierwsza');
        expect(formatPolishTime(createDate(13, 0), 'natural')).toBe('Pierwsza');
      });

      it('formats 08:00 and 20:00 as "Ósma"', () => {
        expect(formatPolishTime(createDate(8, 0), 'natural')).toBe('Ósma');
        expect(formatPolishTime(createDate(20, 0), 'natural')).toBe('Ósma');
      });

      it('formats 23:00 as "Jedenasta"', () => {
        expect(formatPolishTime(createDate(23, 0), 'natural')).toBe('Jedenasta');
      });
    });

    describe('quarter past (:15)', () => {
      it('formats 14:15 as "Piętnaście po drugiej"', () => {
        expect(formatPolishTime(createDate(14, 15), 'natural')).toBe(
          'Piętnaście po drugiej'
        );
      });

      it('formats 08:15 as "Piętnaście po ósmej"', () => {
        expect(formatPolishTime(createDate(8, 15), 'natural')).toBe(
          'Piętnaście po ósmej'
        );
      });

      it('formats 12:15 as "Piętnaście po dwunastej"', () => {
        expect(formatPolishTime(createDate(12, 15), 'natural')).toBe(
          'Piętnaście po dwunastej'
        );
      });

      it('formats 00:15 as "Piętnaście po dwunastej"', () => {
        expect(formatPolishTime(createDate(0, 15), 'natural')).toBe(
          'Piętnaście po dwunastej'
        );
      });
    });

    describe('half past (:30)', () => {
      it('formats 17:30 as "Wpół do szóstej"', () => {
        expect(formatPolishTime(createDate(17, 30), 'natural')).toBe(
          'Wpół do szóstej'
        );
      });

      it('formats 08:30 as "Wpół do dziewiątej"', () => {
        expect(formatPolishTime(createDate(8, 30), 'natural')).toBe(
          'Wpół do dziewiątej'
        );
      });

      it('formats 12:30 as "Wpół do pierwszej"', () => {
        expect(formatPolishTime(createDate(12, 30), 'natural')).toBe(
          'Wpół do pierwszej'
        );
      });

      it('formats 23:30 as "Wpół do dwunastej"', () => {
        expect(formatPolishTime(createDate(23, 30), 'natural')).toBe(
          'Wpół do dwunastej'
        );
      });

      it('formats 00:30 as "Wpół do pierwszej"', () => {
        expect(formatPolishTime(createDate(0, 30), 'natural')).toBe(
          'Wpół do pierwszej'
        );
      });
    });

    describe('quarter to (:45)', () => {
      it('formats 08:45 as "Za piętnaście dziewiąta"', () => {
        expect(formatPolishTime(createDate(8, 45), 'natural')).toBe(
          'Za piętnaście dziewiąta'
        );
      });

      it('formats 14:45 as "Za piętnaście trzecia"', () => {
        expect(formatPolishTime(createDate(14, 45), 'natural')).toBe(
          'Za piętnaście trzecia'
        );
      });

      it('formats 12:45 as "Za piętnaście pierwsza"', () => {
        expect(formatPolishTime(createDate(12, 45), 'natural')).toBe(
          'Za piętnaście pierwsza'
        );
      });

      it('formats 23:45 as "Za piętnaście dwunasta"', () => {
        expect(formatPolishTime(createDate(23, 45), 'natural')).toBe(
          'Za piętnaście dwunasta'
        );
      });
    });

    describe('minutes 1..29 (except 15)', () => {
      it('formats 01:01 as "Jedna minuta po pierwszej"', () => {
        expect(formatPolishTime(createDate(1, 1), 'natural')).toBe(
          'Jedna minuta po pierwszej'
        );
      });

      it('formats 14:02 as "Dwie po drugiej"', () => {
        expect(formatPolishTime(createDate(14, 2), 'natural')).toBe(
          'Dwie po drugiej'
        );
      });

      it('formats 14:05 as "Pięć po drugiej"', () => {
        expect(formatPolishTime(createDate(14, 5), 'natural')).toBe(
          'Pięć po drugiej'
        );
      });

      it('formats 08:10 as "Dziesięć po ósmej"', () => {
        expect(formatPolishTime(createDate(8, 10), 'natural')).toBe(
          'Dziesięć po ósmej'
        );
      });

      it('formats 08:20 as "Dwadzieścia po ósmej"', () => {
        expect(formatPolishTime(createDate(8, 20), 'natural')).toBe(
          'Dwadzieścia po ósmej'
        );
      });

      it('formats 08:25 as "Dwadzieścia pięć po ósmej"', () => {
        expect(formatPolishTime(createDate(8, 25), 'natural')).toBe(
          'Dwadzieścia pięć po ósmej'
        );
      });

      it('formats 08:29 as "Dwadzieścia dziewięć po ósmej"', () => {
        expect(formatPolishTime(createDate(8, 29), 'natural')).toBe(
          'Dwadzieścia dziewięć po ósmej'
        );
      });
    });

    describe('minutes 31..59 (except 45)', () => {
      it('formats 05:59 as "Za jedną minutę szósta"', () => {
        expect(formatPolishTime(createDate(5, 59), 'natural')).toBe(
          'Za jedną minutę szósta'
        );
      });

      it('formats 05:58 as "Za dwie szósta"', () => {
        expect(formatPolishTime(createDate(5, 58), 'natural')).toBe(
          'Za dwie szósta'
        );
      });

      it('formats 02:55 as "Za pięć trzecia"', () => {
        expect(formatPolishTime(createDate(2, 55), 'natural')).toBe(
          'Za pięć trzecia'
        );
      });

      it('formats 02:50 as "Za dziesięć trzecia"', () => {
        expect(formatPolishTime(createDate(2, 50), 'natural')).toBe(
          'Za dziesięć trzecia'
        );
      });

      it('formats 04:40 as "Za dwadzieścia piąta"', () => {
        expect(formatPolishTime(createDate(4, 40), 'natural')).toBe(
          'Za dwadzieścia piąta'
        );
      });

      it('formats 04:35 as "Za dwadzieścia pięć piąta"', () => {
        expect(formatPolishTime(createDate(4, 35), 'natural')).toBe(
          'Za dwadzieścia pięć piąta'
        );
      });

      it('formats 04:31 as "Za dwadzieścia dziewięć piąta"', () => {
        expect(formatPolishTime(createDate(4, 31), 'natural')).toBe(
          'Za dwadzieścia dziewięć piąta'
        );
      });
    });
  });

  describe('short style (Krótki)', () => {
    it('formats full hours as capitalized hour name', () => {
      expect(formatPolishTime(createDate(12, 0), 'short')).toBe('Dwunasta');
      expect(formatPolishTime(createDate(20, 0), 'short')).toBe('Dwudziesta');
      expect(formatPolishTime(createDate(8, 0), 'short')).toBe('Ósma');
      expect(formatPolishTime(createDate(0, 0), 'short')).toBe('Zero');
    });

    it('formats hour with minutes with leading zero', () => {
      expect(formatPolishTime(createDate(8, 5), 'short')).toBe('Ósma zero pięć');
      expect(formatPolishTime(createDate(12, 1), 'short')).toBe(
        'Dwunasta zero jeden'
      );
    });

    it('formats hour with regular minutes', () => {
      expect(formatPolishTime(createDate(12, 15), 'short')).toBe(
        'Dwunasta piętnaście'
      );
      expect(formatPolishTime(createDate(14, 15), 'short')).toBe(
        'Czternasta piętnaście'
      );
      expect(formatPolishTime(createDate(17, 30), 'short')).toBe(
        'Siedemnasta trzydzieści'
      );
      expect(formatPolishTime(createDate(21, 30), 'short')).toBe(
        'Dwudziesta pierwsza trzydzieści'
      );
    });
  });

  describe('elapsed style & formatElapsedAnnouncement', () => {
    it('declines 1 minute correctly: "Minęła 1 minuta. Jest 10:01"', () => {
      const date = createDate(10, 1);
      expect(formatElapsedAnnouncement(1, date)).toBe(
        'Minęła 1 minuta. Jest 10:01'
      );
      expect(formatPolishTime(date, 'elapsed', { elapsedMinutes: 1 })).toBe(
        'Minęła 1 minuta. Jest 10:01'
      );
    });

    it('declines 2-4 minutes correctly: "Minęły 2 minuty. Jest 10:02"', () => {
      const date2 = createDate(10, 2);
      expect(formatElapsedAnnouncement(2, date2)).toBe(
        'Minęły 2 minuty. Jest 10:02'
      );

      const date4 = createDate(10, 4);
      expect(formatElapsedAnnouncement(4, date4)).toBe(
        'Minęły 4 minuty. Jest 10:04'
      );
    });

    it('declines 5-21 minutes correctly: "Minęło 5 minut. Jest 14:15"', () => {
      const date5 = createDate(14, 15);
      expect(formatElapsedAnnouncement(5, date5)).toBe(
        'Minęło 5 minut. Jest 14:15'
      );

      const date10 = createDate(14, 10);
      expect(formatElapsedAnnouncement(10, date10)).toBe(
        'Minęło 10 minut. Jest 14:10'
      );

      const date21 = createDate(14, 21);
      expect(formatElapsedAnnouncement(21, date21)).toBe(
        'Minęło 21 minut. Jest 14:21'
      );
    });

    it('declines 22-24 minutes correctly: "Minęły 22 minuty. Jest 14:22"', () => {
      const date22 = createDate(14, 22);
      expect(formatElapsedAnnouncement(22, date22)).toBe(
        'Minęły 22 minuty. Jest 14:22'
      );
    });

    it('declines 25+ minutes correctly: "Minęło 25 minut. Jest 14:25"', () => {
      const date25 = createDate(14, 25);
      expect(formatElapsedAnnouncement(25, date25)).toBe(
        'Minęło 25 minut. Jest 14:25'
      );
    });

    it('handles session end announcement', () => {
      const date = createDate(11, 0);
      expect(formatElapsedAnnouncement(30, date, true)).toBe(
        'Czas sesji minął! Jest 11:00.'
      );
      expect(
        formatPolishTime(date, 'elapsed', { elapsedMinutes: 30, isSessionEnd: true })
      ).toBe('Czas sesji minął! Jest 11:00.');
    });
  });

  describe('departure style & formatDepartureAnnouncement', () => {
    describe('completion state (isDone or remainingSeconds <= 0)', () => {
      it('formats done state with targetTime', () => {
        const target = createDate(8, 30);
        expect(formatDepartureAnnouncement(0, 'Wyjście z domu', target, true)).toBe(
          'Czas na: Wyjście z domu! Jest 08:30.'
        );
        expect(formatDepartureAnnouncement(0, 'Wyjście z domu', target)).toBe(
          'Czas na: Wyjście z domu! Jest 08:30.'
        );
        expect(formatDepartureAnnouncement(-15, 'Spotkanie', createDate(14, 0))).toBe(
          'Czas na: Spotkanie! Jest 14:00.'
        );
      });

      it('formats done state without targetTime', () => {
        expect(formatDepartureAnnouncement(0, 'Wyjście z domu')).toBe(
          'Czas na: Wyjście z domu!'
        );
        expect(formatDepartureAnnouncement(-5, 'Pociąg')).toBe(
          'Czas na: Pociąg!'
        );
        expect(formatDepartureAnnouncement(60, 'Leki', undefined, true)).toBe(
          'Czas na: Leki!'
        );
      });
    });

    describe('sub-minute countdowns (0 < remainingSeconds < 60)', () => {
      it('formats <= 30 seconds as "Za pół minuty: {label}."', () => {
        expect(formatDepartureAnnouncement(30, 'Wyjście z domu')).toBe(
          'Za pół minuty: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(15, 'Spotkanie')).toBe(
          'Za pół minuty: Spotkanie.'
        );
        expect(formatDepartureAnnouncement(1, 'Pociąg')).toBe(
          'Za pół minuty: Pociąg.'
        );
      });

      it('formats > 30 seconds as "Mniej niż minuta do: {label}."', () => {
        expect(formatDepartureAnnouncement(31, 'Wyjście z domu')).toBe(
          'Mniej niż minuta do: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(45, 'Spotkanie')).toBe(
          'Mniej niż minuta do: Spotkanie.'
        );
        expect(formatDepartureAnnouncement(59, 'Pociąg')).toBe(
          'Mniej niż minuta do: Pociąg.'
        );
      });
    });

    describe('minutes declension for countdowns', () => {
      it('formats 1 minute as "Za minutę: {label}."', () => {
        expect(formatDepartureAnnouncement(60, 'Wyjście z domu')).toBe(
          'Za minutę: Wyjście z domu.'
        );
      });

      it('formats 2, 3, 4 minutes as "Za {n} minuty: {label}."', () => {
        expect(formatDepartureAnnouncement(120, 'Spotkanie')).toBe(
          'Za 2 minuty: Spotkanie.'
        );
        expect(formatDepartureAnnouncement(180, 'Gotowanie')).toBe(
          'Za 3 minuty: Gotowanie.'
        );
        expect(formatDepartureAnnouncement(240, 'Pociąg')).toBe(
          'Za 4 minuty: Pociąg.'
        );
      });

      it('formats 5 to 21 minutes as "Za {n} minut: {label}."', () => {
        expect(formatDepartureAnnouncement(300, 'Wyjście z domu')).toBe(
          'Za 5 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(600, 'Wyjście z domu')).toBe(
          'Za 10 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(660, 'Wyjście z domu')).toBe(
          'Za 11 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(720, 'Wyjście z domu')).toBe(
          'Za 12 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(780, 'Wyjście z domu')).toBe(
          'Za 13 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(840, 'Wyjście z domu')).toBe(
          'Za 14 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(900, 'Wyjście z domu')).toBe(
          'Za 15 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(1200, 'Wyjście z domu')).toBe(
          'Za 20 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(1260, 'Wyjście z domu')).toBe(
          'Za 21 minut: Wyjście z domu.'
        );
      });

      it('formats 22, 23, 24 minutes as "Za {n} minuty: {label}."', () => {
        expect(formatDepartureAnnouncement(1320, 'Wyjście z domu')).toBe(
          'Za 22 minuty: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(1380, 'Wyjście z domu')).toBe(
          'Za 23 minuty: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(1440, 'Wyjście z domu')).toBe(
          'Za 24 minuty: Wyjście z domu.'
        );
      });

      it('formats 25+ minutes correctly', () => {
        expect(formatDepartureAnnouncement(1500, 'Wyjście z domu')).toBe(
          'Za 25 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(1860, 'Wyjście z domu')).toBe(
          'Za 31 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(1920, 'Wyjście z domu')).toBe(
          'Za 32 minuty: Wyjście z domu.'
        );
      });
    });

    describe('wall-clock time context for >= 900s with targetTime', () => {
      it('appends current time when remainingSeconds >= 900 and targetTime is provided', () => {
        const target1 = createDate(8, 30);
        expect(formatDepartureAnnouncement(900, 'Wyjście z domu', target1)).toBe(
          'Za 15 minut: Wyjście z domu. Jest 08:15.'
        );

        const target2 = createDate(9, 0);
        expect(formatDepartureAnnouncement(1800, 'Spotkanie', target2)).toBe(
          'Za 30 minut: Spotkanie. Jest 08:30.'
        );

        const target3 = createDate(10, 0);
        expect(formatDepartureAnnouncement(2700, 'Pociąg', target3)).toBe(
          'Za 45 minut: Pociąg. Jest 09:15.'
        );

        const target4 = createDate(12, 0);
        expect(formatDepartureAnnouncement(3600, 'Wizyta u lekarza', target4)).toBe(
          'Za 60 minut: Wizyta u lekarza. Jest 11:00.'
        );

        const target5 = createDate(8, 30);
        expect(formatDepartureAnnouncement(1320, 'Wyjście z domu', target5)).toBe(
          'Za 22 minuty: Wyjście z domu. Jest 08:08.'
        );
      });

      it('does NOT append current time when remainingSeconds < 900 even if targetTime is provided', () => {
        const target = createDate(8, 30);
        expect(formatDepartureAnnouncement(300, 'Wyjście z domu', target)).toBe(
          'Za 5 minut: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(240, 'Wyjście z domu', target)).toBe(
          'Za 4 minuty: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(60, 'Wyjście z domu', target)).toBe(
          'Za minutę: Wyjście z domu.'
        );
      });
    });

    describe('rounding of remainingSeconds to nearest minute', () => {
      it('rounds non-exact seconds when >= 60', () => {
        expect(formatDepartureAnnouncement(119, 'Wyjście z domu')).toBe(
          'Za 2 minuty: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(121, 'Wyjście z domu')).toBe(
          'Za 2 minuty: Wyjście z domu.'
        );
        expect(formatDepartureAnnouncement(65, 'Wyjście z domu')).toBe(
          'Za minutę: Wyjście z domu.'
        );
      });
    });
  });

  describe('dictionary & helper functions', () => {
    it('getHourInWords returns correct cases for 0..23', () => {
      expect(getHourInWords(0, 'nominative')).toBe('zero');
      expect(getHourInWords(1, 'nominative')).toBe('pierwsza');
      expect(getHourInWords(12, 'nominative')).toBe('dwunasta');
      expect(getHourInWords(23, 'nominative')).toBe('dwudziesta trzecia');

      expect(getHourInWords(1, 'genitive')).toBe('pierwszej');
      expect(getHourInWords(2, 'genitive')).toBe('drugiej');
      expect(getHourInWords(8, 'genitive')).toBe('ósmej');
      expect(getHourInWords(12, 'genitive')).toBe('dwunastej');
    });

    it('getMinuteInWords returns correct words for 0..59', () => {
      expect(getMinuteInWords(0)).toBe('zero zero');
      expect(getMinuteInWords(5)).toBe('zero pięć');
      expect(getMinuteInWords(15)).toBe('piętnaście');
      expect(getMinuteInWords(30)).toBe('trzydzieści');
      expect(getMinuteInWords(45)).toBe('czterdzieści pięć');
      expect(getMinuteInWords(59)).toBe('pięćdziesiąt dziewięć');
    });

    it('getDeclinedMinutes returns correct grammar metadata', () => {
      expect(getDeclinedMinutes(1)).toEqual({
        verb: 'Minęła',
        count: 1,
        noun: 'minuta',
        phrase: 'Minęła 1 minuta',
      });
      expect(getDeclinedMinutes(3)).toEqual({
        verb: 'Minęły',
        count: 3,
        noun: 'minuty',
        phrase: 'Minęły 3 minuty',
      });
      expect(getDeclinedMinutes(10)).toEqual({
        verb: 'Minęło',
        count: 10,
        noun: 'minut',
        phrase: 'Minęło 10 minut',
      });
      expect(getDeclinedMinutes(24)).toEqual({
        verb: 'Minęły',
        count: 24,
        noun: 'minuty',
        phrase: 'Minęły 24 minuty',
      });
    });

    it('exhaustive check: formats all 1440 minutes of a day without errors', () => {
      const styles: TimeFormatStyle[] = ['precise', 'natural', 'short', 'elapsed'];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m++) {
          const d = createDate(h, m);
          for (const style of styles) {
            const result = formatPolishTime(d, style, { elapsedMinutes: m });
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).not.toContain('undefined');
            expect(result).not.toContain('null');
            expect(result).not.toContain('NaN');
          }
        }
      }
    });
  });
});
