import { useCallback, useEffect, useRef, useState } from 'react';
import { AmbienceGenerator } from './audio';
import type { SensoryAmbience } from './types';

/**
 * Dźwięk tła — jedyne miejsce, w którym generator z audio.ts spotyka się z interfejsem.
 *
 * Do tej pory przyciski dźwięku przełączały wyłącznie kolor tła: AmbienceGenerator
 * nie był importowany nigdzie poza własnym testem. Ten hook go podpina i pilnuje
 * trzech rzeczy, bez których „działający" przycisk nadal dawałby ciszę:
 *
 *  1. AudioContext powstaje i jest wznawiany WEWNĄTRZ gestu użytkowniczki —
 *     iOS tworzy kontekst w stanie `suspended` i odblokowuje go dopiero
 *     wywołaniem resume() w tym samym zdarzeniu dotyku.
 *  2. Głośność dochodzi rampą (100 ms), nie skokiem — szum włączony na pełnej
 *     wartości w jednej próbce daje słyszalny trzask.
 *  3. Cisza przy schowaniu aplikacji i przy odmontowaniu — z jawnym zgaszeniem
 *     stanu w interfejsie, żeby nigdy nie było tak, że przycisk świeci,
 *     a nic nie gra.
 */

/** Sufit wzmocnienia. Szum brązowy przy 1.0 jest realnie za głośny w słuchawkach. */
const MAX_GAIN = 0.5;

const toGain = (percent: number): number =>
  (Math.min(100, Math.max(0, percent)) / 100) * MAX_GAIN;

/**
 * `ctx` jest w AmbienceGenerator prywatne — ale wyłącznie w sensie TypeScriptu,
 * a audio.ts jest poza zakresem tej zmiany i nie wystawia resume(). Sięgamy
 * po pole przez rzutowanie i wyłącznie po to, żeby odblokować kontekst.
 */
function resumeContext(generator: AmbienceGenerator): void {
  const ctx = (generator as unknown as { ctx: AudioContext | null }).ctx;
  if (!ctx || typeof ctx.resume !== 'function') return;
  if (ctx.state === 'running') return;
  void ctx.resume().catch(() => {
    /* przeglądarka odmówiła — stan i tak wróci przy następnym dotknięciu */
  });
}

export interface AmbienceController {
  /** Co faktycznie gra. `none` znaczy cisza — także wtedy, gdy start się nie udał. */
  active: SensoryAmbience;
  /** Głośność w procentach, wspólna dla wszystkich dźwięków. */
  volume: number;
  /** false, gdy przeglądarka nie ma Web Audio — interfejs mówi o tym wprost. */
  supported: boolean;
  /** Wywołuj wyłącznie z procedury obsługi gestu (klik, dotknięcie). */
  play: (sound: SensoryAmbience) => void;
  toggle: (sound: SensoryAmbience) => void;
  stop: () => void;
  setVolume: (percent: number) => void;
}

export function useAmbience(initialVolume = 40): AmbienceController {
  const generatorRef = useRef<AmbienceGenerator | null>(null);
  const [active, setActive] = useState<SensoryAmbience>('none');
  const [volume, setVolumeState] = useState(initialVolume);
  const [supported, setSupported] = useState(true);

  const stop = useCallback(() => {
    try {
      generatorRef.current?.stop();
    } catch {
      /* kontekst już zamknięty — cisza i tak jest tym, czego chcemy */
    }
    setActive('none');
  }, []);

  const play = useCallback(
    (sound: SensoryAmbience) => {
      if (sound === 'none') {
        stop();
        return;
      }
      try {
        const generator = generatorRef.current ?? new AmbienceGenerator();
        generatorRef.current = generator;

        // Start od zera, potem rampa — pierwsze wywołanie tworzy AudioContext,
        // a dzieje się to w gescie, więc iOS pozwala go wznowić.
        generator.play(sound, 0);
        resumeContext(generator);
        generator.setVolume(toGain(volume));

        setSupported(true);
        setActive(sound);
      } catch {
        // Brak Web Audio. Nie udajemy, że gra.
        setSupported(false);
        setActive('none');
      }
    },
    [stop, volume]
  );

  const toggle = useCallback(
    (sound: SensoryAmbience) => {
      if (active === sound) stop();
      else play(sound);
    },
    [active, play, stop]
  );

  const setVolume = useCallback((percent: number) => {
    setVolumeState(percent);
    try {
      generatorRef.current?.setVolume(toGain(percent));
    } catch {
      /* nic nie gra — nowa wartość zadziała przy następnym starcie */
    }
  }, []);

  // Schowana aplikacja milknie. Nie wznawiamy sami: po powrocie z tła iOS
  // wymaga kolejnego gestu, a „gra, ale nie słychać" jest gorsze niż cisza.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        generatorRef.current?.stop();
      } catch {
        /* jw. */
      }
    };
  }, [stop]);

  return { active, volume, supported, play, toggle, stop, setVolume };
}
