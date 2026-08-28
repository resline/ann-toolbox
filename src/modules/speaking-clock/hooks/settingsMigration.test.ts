import { describe, it, expect } from 'vitest';
import { migrateStoredSettings } from './useSpeakingClock';
import { DEFAULT_SPEAKING_CLOCK_SETTINGS } from '../types';

/**
 * Do tej pory ten sam parametr istniał pod dwiema nazwami naraz, a silnik
 * czytał wariant „legacy". Ujednolicenie nazw bez migracji zresetowałoby
 * zapisane ustawienia głosu — te testy pilnują, żeby tak się nie stało.
 */
describe('migracja zapisanych ustawień zegara', () => {
  it('przenosi tempo, ton i głośność mowy na nazwy kanoniczne', () => {
    const migrated = migrateStoredSettings({
      speechRate: 1.3,
      speechPitch: 0.8,
      speechVolume: 0.6,
    });

    expect(migrated.rate).toBe(1.3);
    expect(migrated.pitch).toBe(0.8);
    expect(migrated.volume).toBe(0.6);
  });

  it('przenosi ustawienie gongu i blokady wygaszania', () => {
    const migrated = migrateStoredSettings({
      playChimeBefore: false,
      wakeLockEnabled: true,
    });

    expect(migrated.chimeEnabled).toBe(false);
    expect(migrated.keepAwake).toBe(true);
  });

  it('nie zostawia po sobie nazw sprzed ujednolicenia', () => {
    const migrated = migrateStoredSettings({
      speechRate: 1.2,
      playChimeBefore: true,
      wakeLockEnabled: false,
    }) as Record<string, unknown>;

    for (const legacy of ['speechRate', 'speechPitch', 'speechVolume', 'playChimeBefore', 'wakeLockEnabled']) {
      expect(migrated, legacy).not.toHaveProperty(legacy);
    }
  });

  it('wartość kanoniczna wygrywa, gdy zapis ma obie', () => {
    const migrated = migrateStoredSettings({ speechRate: 0.5, rate: 1.4 });
    expect(migrated.rate).toBe(1.4);
  });

  it('zachowuje pozostałe pola bez zmian', () => {
    const migrated = migrateStoredSettings({
      intervalMinutes: 15,
      formatStyle: 'precise',
      speechRate: 1.1,
      departure: { targetTime: '08:30' },
    });

    expect(migrated.intervalMinutes).toBe(15);
    expect(migrated.formatStyle).toBe('precise');
    expect(migrated.departure).toEqual({ targetTime: '08:30' });
  });

  it('radzi sobie z zapisem pustym lub uszkodzonym', () => {
    expect(migrateStoredSettings(null)).toEqual({});
    expect(migrateStoredSettings(undefined)).toEqual({});
    expect(migrateStoredSettings('nie-obiekt')).toEqual({});
    expect(migrateStoredSettings(42)).toEqual({});
  });

  it('domyślne ustawienia nie zawierają już zdublowanych nazw', () => {
    const defaults = DEFAULT_SPEAKING_CLOCK_SETTINGS as unknown as Record<string, unknown>;
    for (const legacy of ['speechRate', 'speechPitch', 'speechVolume', 'playChimeBefore', 'wakeLockEnabled']) {
      expect(defaults, legacy).not.toHaveProperty(legacy);
    }
  });
});
