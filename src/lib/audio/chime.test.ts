import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  playChime,
  getAudioContext,
  setAudioContext,
  closeAudioContext,
  CHIME_TONES,
  type ChimeOptions,
  type ChimeTone,
} from './chime';

// Mock Web Audio API classes
interface MockGainParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  setTargetAtTime: ReturnType<typeof vi.fn>;
}

interface MockGainNode {
  gain: MockGainParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface MockOscillatorNode {
  type: OscillatorType;
  frequency: MockGainParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

class MockAudioContext {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  destination = {};
  createdOscillators: MockOscillatorNode[] = [];
  createdGains: MockGainNode[] = [];

  resume = vi.fn().mockImplementation(async () => {
    this.state = 'running';
  });

  close = vi.fn().mockImplementation(async () => {
    this.state = 'closed';
  });

  createGain = vi.fn().mockImplementation((): MockGainNode => {
    const gain: MockGainNode = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.createdGains.push(gain);
    return gain;
  });

  createOscillator = vi.fn().mockImplementation((): MockOscillatorNode => {
    const osc: MockOscillatorNode = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: vi.fn((val: number) => {
          osc.frequency.value = val;
        }),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn().mockImplementation(() => {
        if (osc.onended) {
          osc.onended();
        }
      }),
      onended: null,
    };
    this.createdOscillators.push(osc);
    return osc;
  });
}

describe('syntezator gongu', () => {
  let mockCtx: MockAudioContext;
  const originalAudioContext = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCtx = new MockAudioContext();
    (window as unknown as { AudioContext: unknown }).AudioContext = vi.fn().mockImplementation(() => mockCtx);
    setAudioContext(null); // Reset singleton
  });

  afterEach(async () => {
    await closeAudioContext();
    vi.useRealTimers();
    vi.restoreAllMocks();
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext = originalAudioContext;
  });

  describe('AudioContext initialization & safety', () => {
    it('creates or reuses AudioContext and resumes when suspended', async () => {
      const options: ChimeOptions = { volume: 0.7 };
      const playPromise = playChime(options);
      await vi.runAllTimersAsync();
      await playPromise;

      expect(mockCtx.resume).toHaveBeenCalled();
      expect(getAudioContext()).not.toBeNull();
    });

    it('handles headless / unsupported Web Audio environment gracefully', async () => {
      // @ts-expect-error test environment
      delete window.AudioContext;
      // @ts-expect-error test environment
      delete window.webkitAudioContext;
      setAudioContext(null);

      // Should not throw
      await expect(playChime()).resolves.toBeUndefined();
    });

    it('handles context resume failure gracefully', async () => {
      mockCtx.resume.mockRejectedValueOnce(new Error('Autoplay blocked'));

      // Should catch and not throw unhandled rejection
      await expect(playChime()).resolves.toBeUndefined();
    });

    it('can be injected with custom AudioContext via setAudioContext', async () => {
      const customCtx = new MockAudioContext();
      setAudioContext(customCtx as unknown as AudioContext);

      expect(getAudioContext()).toBe(customCtx);
      const playPromise = playChime();
      await vi.runAllTimersAsync();
      await playPromise;

      expect(customCtx.resume).toHaveBeenCalled();
    });
  });

  describe('Tone frequencies & configurations', () => {
    it('provides metadata for all tone presets in CHIME_TONES', () => {
      const tones: ChimeTone[] = ['gentle', 'warm', 'bright'];
      for (const tone of tones) {
        expect(CHIME_TONES[tone]).toBeDefined();
        expect(CHIME_TONES[tone].components.length).toBeGreaterThanOrEqual(2);
      }
      expect(CHIME_TONES.gentle.name).toContain('528');
    });

    it('generates "gentle" tone with 528 Hz harmonic frequency', async () => {
      const options: ChimeOptions = { tone: 'gentle' };
      const playPromise = playChime(options);
      await vi.runAllTimersAsync();
      await playPromise;

      expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(1);
      const freqs = mockCtx.createdOscillators.map((o) => o.frequency.value);
      expect(freqs).toContain(528);
    });

    it('generates "warm" tone with dual-tone C5 (523.25 Hz) & G5 (783.99 Hz) chord', async () => {
      const options: ChimeOptions = { tone: 'warm' };
      const playPromise = playChime(options);
      await vi.runAllTimersAsync();
      await playPromise;

      expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(2);
      const freqs = mockCtx.createdOscillators.map((o) => Math.round(o.frequency.value * 100) / 100);
      expect(freqs).toContain(523.25);
      expect(freqs).toContain(783.99);
    });

    it('generates "bright" tone with bell chord E5 (659.25 Hz) & B5 (987.77 Hz)', async () => {
      const options: ChimeOptions = { tone: 'bright' };
      const playPromise = playChime(options);
      await vi.runAllTimersAsync();
      await playPromise;

      expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(2);
      const freqs = mockCtx.createdOscillators.map((o) => Math.round(o.frequency.value * 100) / 100);
      expect(freqs).toContain(659.25);
      expect(freqs).toContain(987.77);
    });

    it('falls back to "gentle" tone for unknown tone options', async () => {
      // @ts-expect-error testing invalid tone input
      const playPromise = playChime({ tone: 'unknown-tone' });
      await vi.runAllTimersAsync();
      await playPromise;

      const freqs = mockCtx.createdOscillators.map((o) => o.frequency.value);
      expect(freqs).toContain(528);
    });
  });

  describe('ADSR envelope and volume scheduling', () => {
    it('applies ADSR envelope with soft attack and decay to master gain node', async () => {
      const playPromise = playChime({ volume: 0.8 });
      await vi.runAllTimersAsync();
      await playPromise;

      expect(mockCtx.createdGains.length).toBeGreaterThanOrEqual(1);
      const masterGain = mockCtx.createdGains[0];

      // Check setValueAtTime at start
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalled();
      // Check attack ramp
      expect(
        masterGain.gain.linearRampToValueAtTime.mock.calls.length > 0 ||
        masterGain.gain.exponentialRampToValueAtTime.mock.calls.length > 0
      ).toBe(true);
    });

    it('clamps volume to [0.0, 1.0] range', async () => {
      // Volume > 1
      const playPromiseOver = playChime({ volume: 1.5 });
      await vi.runAllTimersAsync();
      await playPromiseOver;

      const masterGain1 = mockCtx.createdGains[0];
      // Peak volume should be <= 1.0
      const rampValues1 = [
        ...masterGain1.gain.linearRampToValueAtTime.mock.calls.map((c) => c[0]),
        ...masterGain1.gain.exponentialRampToValueAtTime.mock.calls.map((c) => c[0]),
      ];
      expect(Math.max(...rampValues1)).toBeLessThanOrEqual(1.0);

      // Volume < 0
      mockCtx.createdGains = [];
      const playPromiseUnder = playChime({ volume: -0.5 });
      await vi.runAllTimersAsync();
      await playPromiseUnder;

      // With volume <= 0, should resolve immediately without creating gain nodes
      expect(mockCtx.createdGains.length).toBe(0);
    });

    it('handles volume 0 by resolving without playing sound', async () => {
      const playPromise = playChime({ volume: 0 });
      await vi.runAllTimersAsync();
      await playPromise;

      expect(mockCtx.createdOscillators.length).toBe(0);
    });

    it('uses default volume (0.7) when no volume option is specified', async () => {
      const playPromise = playChime();
      await vi.runAllTimersAsync();
      await playPromise;

      expect(mockCtx.createdGains.length).toBeGreaterThanOrEqual(1);
      const masterGain = mockCtx.createdGains[0];
      const rampValues = [
        ...masterGain.gain.linearRampToValueAtTime.mock.calls.map((c) => c[0]),
        ...masterGain.gain.exponentialRampToValueAtTime.mock.calls.map((c) => c[0]),
      ];
      // Peak volume should be ~0.7
      expect(rampValues.some((v) => Math.abs(v - 0.7) < 0.01)).toBe(true);
    });
  });

  describe('Lifecycle and cleanup', () => {
    it('starts and stops all oscillators and connects nodes to destination', async () => {
      const playPromise = playChime();
      await vi.runAllTimersAsync();
      await playPromise;

      for (const osc of mockCtx.createdOscillators) {
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();
        expect(osc.connect).toHaveBeenCalled();
      }
    });

    it('disconnects nodes on stop / end', async () => {
      const playPromise = playChime();
      await vi.runAllTimersAsync();
      await playPromise;

      for (const osc of mockCtx.createdOscillators) {
        expect(osc.disconnect).toHaveBeenCalled();
      }
    });

    it('closeAudioContext closes the active context cleanly', async () => {
      const playPromise = playChime();
      await vi.runAllTimersAsync();
      await playPromise;

      expect(getAudioContext()).not.toBeNull();
      await closeAudioContext();
      expect(getAudioContext()).toBeNull();
      expect(mockCtx.close).toHaveBeenCalled();
    });
  });
});
