import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HAPTICS_STORAGE_KEY,
  HAPTIC_PATTERNS,
  haptic,
  hapticComplete,
  hapticConfirm,
  hapticTap,
  hapticWarning,
  isHapticsEnabled,
  isHapticsSupported,
  readHapticsPreference,
  stopHaptics,
  writeHapticsPreference,
} from './haptics';
import { MOTION_STORAGE_KEY } from '../motion';

/** Atrapa navigator.vibrate — jsdom nie ma tego API wcale. */
function stubVibrate(result = true) {
  const vibrate = vi.fn().mockReturnValue(result);
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrate,
    configurable: true,
    writable: true,
  });
  return vibrate;
}

function removeVibrate() {
  Reflect.deleteProperty(navigator, 'vibrate');
}

beforeEach(() => {
  localStorage.clear();
  removeVibrate();
});

afterEach(() => {
  removeVibrate();
  vi.restoreAllMocks();
});

describe('haptyka — wykrywanie API', () => {
  it('milczy tam, gdzie navigator.vibrate nie istnieje', () => {
    expect(isHapticsSupported()).toBe(false);
    expect(isHapticsEnabled()).toBe(false);
    expect(() => hapticTap()).not.toThrow();
    expect(hapticTap()).toBe(false);
  });

  it('rozpoznaje dostępne API', () => {
    stubVibrate();

    expect(isHapticsSupported()).toBe(true);
    expect(isHapticsEnabled()).toBe(true);
  });

  it('nie przewraca się, gdy przeglądarka rzuci przy wibracji', () => {
    const vibrate = stubVibrate();
    vibrate.mockImplementation(() => {
      throw new Error('vibrate bez gestu użytkownika');
    });

    expect(hapticConfirm()).toBe(false);
  });

  it('zgłasza brak sygnału, gdy przeglądarka odmówi wykonania wzorca', () => {
    stubVibrate(false);

    expect(hapticTap()).toBe(false);
  });
});

describe('haptyka — znaczenia sygnałów', () => {
  it('każde znaczenie ma własny, krótki wzorzec', () => {
    const vibrate = stubVibrate();

    hapticTap();
    hapticConfirm();
    hapticComplete();
    hapticWarning();

    expect(vibrate.mock.calls.map((call) => call[0])).toEqual([
      HAPTIC_PATTERNS.tap,
      HAPTIC_PATTERNS.confirm,
      HAPTIC_PATTERNS.complete,
      HAPTIC_PATTERNS.warning,
    ]);
  });

  it('WZORCE ZOSTAJĄ KRÓTKIE — TO APLIKACJA O WYCISZANIU', () => {
    for (const pattern of Object.values(HAPTIC_PATTERNS)) {
      const total = pattern.reduce((sum, part) => sum + part, 0);
      expect(total).toBeLessThanOrEqual(250);
      expect(pattern.length).toBeLessThanOrEqual(3);
    }
  });

  it('nie oddaje modułom tablicy wzorca do przypadkowej modyfikacji', () => {
    const vibrate = stubVibrate();

    haptic('complete');

    const sent = vibrate.mock.calls[0][0] as number[];
    expect(sent).not.toBe(HAPTIC_PATTERNS.complete);
    expect(sent).toEqual([...HAPTIC_PATTERNS.complete]);
  });

  it('przerywa trwający wzorzec bez pytania o ustawienia', () => {
    const vibrate = stubVibrate();
    writeHapticsPreference('off');

    stopHaptics();

    expect(vibrate).toHaveBeenCalledWith(0);
  });
});

describe('haptyka — przełącznik użytkowniczki', () => {
  it('domyślnie jest włączona', () => {
    expect(readHapticsPreference()).toBe('on');
  });

  it('zapisuje i odczytuje ustawienie pod kluczem z prefiksem ann_', () => {
    writeHapticsPreference('off');

    expect(localStorage.getItem(HAPTICS_STORAGE_KEY)).toBe('off');
    expect(HAPTICS_STORAGE_KEY.startsWith('ann_')).toBe(true);
    expect(readHapticsPreference()).toBe('off');
  });

  it('WYŁĄCZONY PRZEŁĄCZNIK ZNACZY CISZĘ, NIE CICHSZĄ WIBRACJĘ', () => {
    const vibrate = stubVibrate();
    writeHapticsPreference('off');

    expect(isHapticsEnabled()).toBe(false);
    expect(hapticComplete()).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('wraca do domyślnego ustawienia przy zaśmieconym zapisie', () => {
    localStorage.setItem(HAPTICS_STORAGE_KEY, 'byle-co');

    expect(readHapticsPreference()).toBe('on');
  });

  it('nie wywraca się przy zablokowanym localStorage', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage zablokowany');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage zablokowany');
    });

    expect(() => writeHapticsPreference('off')).not.toThrow();
    expect(readHapticsPreference()).toBe('on');

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe('haptyka — ograniczony ruch', () => {
  it('ustawienie „ograniczony ruch" ucisza wibracje', () => {
    const vibrate = stubVibrate();
    localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');

    expect(isHapticsEnabled()).toBe(false);
    expect(hapticConfirm()).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('ustawienie „pełny ruch" wygrywa z flagą systemową', () => {
    const vibrate = stubVibrate();
    localStorage.setItem(MOTION_STORAGE_KEY, 'full');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    expect(hapticTap()).toBe(true);
    expect(vibrate).toHaveBeenCalled();
  });

  it('przy „auto" decyduje flaga systemowa', () => {
    const vibrate = stubVibrate();
    localStorage.setItem(MOTION_STORAGE_KEY, 'auto');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    expect(hapticTap()).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });
});
