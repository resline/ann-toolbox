/**
 * Chime Synthesizer Service
 *
 * Generates soft, ADHD-friendly harmonic alert chimes using the Web Audio API.
 * Uses ADSR envelope scheduling (attack ~40ms, decay ~120ms, sustain ~0.3, release ~600ms)
 * to eliminate sudden startle response (no clicks, pops, or harsh waveforms).
 */

export type ChimeTone = 'gentle' | 'warm' | 'bright';

export interface ChimeOptions {
  volume?: number;
  tone?: ChimeTone;
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
  }
}

/**
 * Retrieves or lazily instantiates the shared AudioContext.
 */
function getOrCreateAudioContext(): AudioContext | null {
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    return sharedAudioContext;
  }

  const AudioCtxClass =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!AudioCtxClass) {
    return null;
  }

  try {
    sharedAudioContext = new AudioCtxClass();
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Plays a gentle, harmonic chime alert before voice announcements.
 *
 * @param options Volume (0.0 to 1.0) and tone type ('gentle', 'warm', 'bright')
 * @returns Promise that resolves when the chime sound completes
 */
export async function playChime(options?: ChimeOptions): Promise<void> {
  const ctx = getOrCreateAudioContext();
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
