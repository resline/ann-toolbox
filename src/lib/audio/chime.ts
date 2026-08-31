/**
 * Syntezator gongu (Web Audio).
 *
 * Mieszka poza modułami, bo używają go dwa: Czas (sygnał przed wypowiedzią)
 * i Energia (tykanie koła, dźwięk trybu SOS). Wcześniej Energia importowała
 * go z wnętrza Czasu, co wiązało ze sobą moduły bez powodu.
 */

/**
 * Chime Synthesizer Service
 *
 * Generates soft, ADHD-friendly harmonic alert chimes using the Web Audio API.
 * Uses ADSR envelope scheduling (attack ~40ms, decay ~120ms, sustain ~0.3, release ~600ms)
 * to eliminate sudden startle response (no clicks, pops, or harsh waveforms).
 */

export type ChimeTone = 'gentle' | 'warm' | 'bright';
export const SHARED_AUDIO_SAMPLE_RATE_HZ = 24_000;

export interface ChimeOptions {
  volume?: number;
  tone?: ChimeTone;
}

export interface ScheduledChime {
  startAt: number;
  endAt: number;
  stop: () => void;
}

export interface ToneComponent {
  frequency: number;
  type?: OscillatorType;
  gain: number;
}

export const CHIME_TONES: Record<ChimeTone, { name: string; description: string; components: ToneComponent[] }> = {
  gentle: {
    name: 'Łagodny (528 Hz)',
    description: 'Harmonijna częstotliwość Solfeggio z miękkim sub-tonem (fala sinusoidalna)',
    components: [
      { frequency: 528, type: 'sine', gain: 0.8 },
      { frequency: 264, type: 'sine', gain: 0.3 },
    ],
  },
  warm: {
    name: 'Ciepły (Marimba C5/G5)',
    description: 'Ciepły akord kwintowy marimby z miękką falą trójkątną i sinusoidalną',
    components: [
      { frequency: 523.25, type: 'triangle', gain: 0.7 },
      { frequency: 783.99, type: 'sine', gain: 0.4 },
      { frequency: 261.63, type: 'sine', gain: 0.2 },
    ],
  },
  bright: {
    name: 'Jasny dzwonek (E5/B5)',
    description: 'Krystaliczny akord dzwonka z delikatnym połyskiem harmonicznym',
    components: [
      { frequency: 659.25, type: 'sine', gain: 0.7 },
      { frequency: 987.77, type: 'sine', gain: 0.4 },
      { frequency: 1318.51, type: 'sine', gain: 0.15 },
    ],
  },
};

let sharedAudioContext: AudioContext | null = null;

/** Znacznik kontekstu podanego z zewnątrz przez setAudioContext. */
const INJECTED_CONTEXT = Symbol('injected-audio-context');

/**
 * Skąd wziął się zapamiętany kontekst: klasa, która go stworzyła, albo znacznik
 * wstrzyknięcia. Bez tego nie da się odróżnić kontekstu żywego od kontekstu
 * osieroconego po podmianie implementacji Web Audio pod nami — a taki obiekt
 * nadal twierdzi, że jego `state` to „running", i po cichu połyka każdy dźwięk.
 */
let sharedAudioContextOrigin: unknown = null;

/**
 * Returns active shared AudioContext or null.
 */
export function getAudioContext(): AudioContext | null {
  return sharedAudioContext;
}

/**
 * Injects or resets the shared AudioContext (useful for testing or external audio pipeline).
 */
export function setAudioContext(ctx: AudioContext | null): void {
  sharedAudioContext = ctx;
  sharedAudioContextOrigin = ctx ? INJECTED_CONTEXT : null;
}

/**
 * Closes and resets the shared AudioContext.
 */
export async function closeAudioContext(): Promise<void> {
  if (sharedAudioContext) {
    try {
      if (sharedAudioContext.state !== 'closed') {
        await sharedAudioContext.close();
      }
    } catch {
      // Ignore errors on close
    }
    sharedAudioContext = null;
    sharedAudioContextOrigin = null;
  }
}

/** Klasa AudioContext dostępna w tym środowisku (albo undefined poza przeglądarką). */
function resolveAudioContextClass(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

/**
 * Retrieves or lazily instantiates the shared AudioContext.
 *
 * To jedyne wejście do Web Audio w aplikacji: gong, szum tła w Skupieniu
 * i fanfara w Starcie dzielą ten sam kontekst. Trzy osobne konteksty na jednym
 * telefonie potrafią wyczerpać limit sprzętowy przeglądarki i uciszyć wszystko naraz.
 */
export function ensureAudioContext(): AudioContext | null {
  const AudioCtxClass = resolveAudioContextClass();

  // Kontekst wstrzyknięty zostaje aż do jawnego zastąpienia; własny odzyskujemy
  // tylko wtedy, gdy zrodziła go implementacja obowiązująca nadal teraz.
  const originStillValid =
    sharedAudioContextOrigin === INJECTED_CONTEXT || sharedAudioContextOrigin === AudioCtxClass;

  if (sharedAudioContext && originStillValid && sharedAudioContext.state !== 'closed') {
    return sharedAudioContext;
  }

  if (!AudioCtxClass) {
    return null;
  }

  try {
    sharedAudioContext = new AudioCtxClass({
      latencyHint: 'playback',
      sampleRate: SHARED_AUDIO_SAMPLE_RATE_HZ,
    });
    sharedAudioContextOrigin = AudioCtxClass;
    return sharedAudioContext;
  } catch {
    // Keep non-clock audio usable on a browser that rejects the preferred
    // rate. The voice player independently fails closed if its decoded buffer
    // then exceeds the memory contract.
    try {
      sharedAudioContext = new AudioCtxClass();
      sharedAudioContextOrigin = AudioCtxClass;
      return sharedAudioContext;
    } catch {
      return null;
    }
  }
}

/**
 * Schedules a chime on an existing audio timeline without awaiting JavaScript.
 * The speaking clock uses this together with prerecorded speech so Android can
 * render both parts after the page's main thread is suspended.
 */
export function scheduleChime(
  ctx: AudioContext,
  startAt: number,
  options?: ChimeOptions
): ScheduledChime {
  const rawVolume = typeof options?.volume === 'number' ? options.volume : 0.7;
  const volume = Math.max(0, Math.min(1, rawVolume));
  const t0 = Math.max(startAt, ctx.currentTime);
  if (volume <= 0) return { startAt: t0, endAt: t0, stop: () => {} };

  const toneKey = options?.tone && CHIME_TONES[options.tone] ? options.tone : 'gentle';
  const toneDef = CHIME_TONES[toneKey];
  const attack = 0.04;
  const decay = 0.12;
  const release = 0.6;
  const totalDuration = attack + decay + release;
  const masterGain = ctx.createGain();
  const peakVolume = Math.max(0.0001, volume);
  const sustainVolume = Math.max(0.0001, peakVolume * 0.3);

  const oscillators: OscillatorNode[] = [];
  const componentGains: GainNode[] = [];
  let stopped = false;
  const stopAndCleanup = () => {
    if (stopped) return;
    stopped = true;
    for (const oscillator of oscillators) {
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* already stopped or not started */ }
      try { oscillator.disconnect(); } catch { /* already disconnected */ }
    }
    for (const gain of componentGains) {
      try { gain.disconnect(); } catch { /* already disconnected */ }
    }
    try { masterGain.disconnect(); } catch { /* already disconnected */ }
  };

  try {
    masterGain.gain.setValueAtTime(0.0001, t0);
    masterGain.gain.linearRampToValueAtTime(peakVolume, t0 + attack);
    masterGain.gain.exponentialRampToValueAtTime(sustainVolume, t0 + attack + decay);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + totalDuration);
    masterGain.gain.setValueAtTime(0, t0 + totalDuration + 0.01);
    masterGain.connect(ctx.destination);

    for (const component of toneDef.components) {
      const oscillator = ctx.createOscillator();
      const componentGain = ctx.createGain();
      oscillators.push(oscillator);
      componentGains.push(componentGain);
      oscillator.type = component.type || 'sine';
      oscillator.frequency.setValueAtTime(component.frequency, t0);
      componentGain.gain.setValueAtTime(component.gain, t0);
      oscillator.connect(componentGain);
      componentGain.connect(masterGain);
      oscillator.start(t0);
      oscillator.stop(t0 + totalDuration + 0.05);
    }
  } catch (error) {
    stopAndCleanup();
    throw error;
  }
  if (oscillators[0]) oscillators[0].onended = stopAndCleanup;

  return {
    startAt: t0,
    endAt: t0 + totalDuration + 0.05,
    stop: stopAndCleanup,
  };
}

/**
 * Plays a gentle, harmonic chime alert before voice announcements.
 *
 * @param options Volume (0.0 to 1.0) and tone type ('gentle', 'warm', 'bright')
 * @returns Promise that resolves when the chime sound completes
 */
export async function playChime(options?: ChimeOptions): Promise<void> {
  const ctx = ensureAudioContext();
  if (!ctx) {
    // Graceful fallback in environments without Web Audio API (SSR / unsupported)
    return;
  }

  // Handle suspended state safely (e.g. browser autoplay policies)
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // AudioContext resume failed (blocked by autoplay policy or browser state)
      return;
    }
  }

  // Normalize volume: default 0.7, clamped between 0.0 and 1.0
  const rawVolume = typeof options?.volume === 'number' ? options.volume : 0.7;
  const volume = Math.max(0, Math.min(1, rawVolume));

  if (volume <= 0) {
    return;
  }

  // Select tone configuration
  const toneKey = options?.tone && CHIME_TONES[options.tone] ? options.tone : 'gentle';
  const toneDef = CHIME_TONES[toneKey];

  // ADSR timing parameters (in seconds)
  // Attack: 40ms, Decay: 120ms, Sustain: 0.3 ratio, Release: 600ms -> Total ~760ms
  const attack = 0.04;
  const decay = 0.12;
  const release = 0.6;
  const totalDuration = attack + decay + release; // 0.76s

  const t0 = ctx.currentTime;
  const peakVolume = Math.max(0.0001, volume);
  const sustainVolume = Math.max(0.0001, peakVolume * 0.3);

  // Master Gain Node with ADSR envelope
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, t0);
  masterGain.gain.linearRampToValueAtTime(peakVolume, t0 + attack);
  masterGain.gain.exponentialRampToValueAtTime(sustainVolume, t0 + attack + decay);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + totalDuration);
  masterGain.gain.setValueAtTime(0, t0 + totalDuration + 0.01);

  masterGain.connect(ctx.destination);

  const oscillators: OscillatorNode[] = [];
  const componentGains: GainNode[] = [];

  for (const comp of toneDef.components) {
    const osc = ctx.createOscillator();
    const compGain = ctx.createGain();

    osc.type = comp.type || 'sine';
    osc.frequency.setValueAtTime(comp.frequency, t0);
    compGain.gain.setValueAtTime(comp.gain, t0);

    osc.connect(compGain);
    compGain.connect(masterGain);

    osc.start(t0);
    osc.stop(t0 + totalDuration + 0.05);

    oscillators.push(osc);
    componentGains.push(compGain);
  }

  return new Promise<void>((resolve) => {
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;

      for (const osc of oscillators) {
        try {
          osc.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }

      for (const compGain of componentGains) {
        try {
          compGain.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }

      try {
        masterGain.disconnect();
      } catch {
        // ignore disconnect errors
      }

      resolve();
    };

    if (oscillators.length > 0) {
      oscillators[0].onended = cleanup;
    }

    // Safety fallback timeout ensuring resolution even if onended doesn't trigger
    setTimeout(cleanup, Math.ceil((totalDuration + 0.08) * 1000));
  });
}

export interface VictoryNote {
  frequency: number;
  /** Przesunięcie względem chwili wywołania, w sekundach. */
  startOffset: number;
  duration: number;
}

/** Arpeggio C-E-G-C. Jedyny dźwięk w aplikacji, któremu wolno się cieszyć. */
export const VICTORY_ARPEGGIO: readonly VictoryNote[] = [
  { frequency: 523.25, startOffset: 0, duration: 0.4 },
  { frequency: 659.25, startOffset: 0.15, duration: 0.4 },
  { frequency: 783.99, startOffset: 0.3, duration: 0.4 },
  { frequency: 1046.5, startOffset: 0.5, duration: 0.8 },
];

/** Szczyt głośności fanfary — wyraźnie ciszej niż gong, bo nie wzywa, tylko gratuluje. */
const VICTORY_PEAK_GAIN = 0.2;

/**
 * Odtwarza fanfarę zakończenia zadania.
 *
 * Mieszka tutaj, a nie w module Start, bo dzieli wspólny kontekst z resztą
 * dźwięków. Synchronicznie i bez oczekiwania: wywołanie idzie z efektu przy
 * pojawieniu się warstwy świętowania, a komponent nie ma na co czekać.
 */
export function playVictoryChime(): void {
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    // Kontekst mógł zostać uśpiony przez politykę autoodtwarzania. Wznawiamy
    // bez oczekiwania — nuty i tak są planowane na osi czasu kontekstu.
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      void ctx.resume().catch(() => {
        /* przeglądarka odmówiła — świętujemy w ciszy */
      });
    }

    const t0 = ctx.currentTime;

    for (const note of VICTORY_ARPEGGIO) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const startAt = t0 + note.startOffset;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, startAt);

      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(VICTORY_PEAK_GAIN, startAt + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startAt + note.duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + note.duration);
    }
  } catch {
    /* przeglądarka bez Web Audio albo zablokowany dźwięk — świętujemy w ciszy */
  }
}
