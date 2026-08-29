import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isSpeechSynthesisSupported,
  getAllVoices,
  getPolishVoices,
  prepareSpeech,
  speakText,
  stopSpeaking,
  isSpeaking,
  SPEECH_RETRY_DELAY_MS,
  SPEECH_START_TIMEOUT_MS,
  type SpeechOptions,
} from './speechService';

// Helper mock voice factory
function createMockVoice(overrides: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice {
  return {
    default: false,
    lang: 'pl-PL',
    localService: true,
    name: 'Zosia (Polish)',
    voiceURI: 'zosia-pl',
    ...overrides,
  };
}

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance implements SpeechSynthesisUtterance {
  text: string;
  lang = 'pl-PL';
  pitch = 1;
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;
  onboundary: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => any) | null = null;
  onmark: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
  onpause: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
  onresume: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();

  constructor(text?: string) {
    this.text = text || '';
  }
}

// Mock SpeechSynthesis
class MockSpeechSynthesis implements SpeechSynthesis {
  paused = false;
  pending = false;
  speaking = false;
  onvoiceschanged: ((this: SpeechSynthesis, ev: Event) => any) | null = null;

  private _voices: SpeechSynthesisVoice[] = [createMockVoice({ default: true })];
  private _listeners: { [key: string]: ((ev: Event) => void)[] } = {};

  getVoices = vi.fn().mockImplementation(() => this._voices);
  speak = vi.fn().mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
    this.speaking = true;
    lastSpokenUtterance = utterance;
    spokenUtterances.push(utterance);

    const originalOnEnd = utterance.onend;
    utterance.onend = (ev) => {
      this.speaking = false;
      if (typeof originalOnEnd === 'function') {
        originalOnEnd.call(utterance, ev);
      }
    };

    const originalOnError = utterance.onerror;
    utterance.onerror = (ev) => {
      this.speaking = false;
      if (typeof originalOnError === 'function') {
        originalOnError.call(utterance, ev);
      }
    };
  });
  cancel = vi.fn().mockImplementation(() => {
    this.speaking = false;
    this.pending = false;
    this.paused = false;
  });
  pause = vi.fn().mockImplementation(() => {
    this.paused = true;
  });
  resume = vi.fn().mockImplementation(() => {
    this.paused = false;
  });

  addEventListener = vi.fn((type: string, listener: any) => {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(listener);
  });
  removeEventListener = vi.fn((type: string, listener: any) => {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter((l) => l !== listener);
  });
  dispatchEvent = vi.fn((event: Event) => {
    if (this._listeners[event.type]) {
      this._listeners[event.type].forEach((l) => l(event));
    }
    return true;
  });

  setVoices(voices: SpeechSynthesisVoice[]) {
    this._voices = voices;
  }

  triggerVoicesChanged(newVoices?: SpeechSynthesisVoice[]) {
    if (newVoices) {
      this._voices = newVoices;
    }
    if (typeof this.onvoiceschanged === 'function') {
      this.onvoiceschanged(new Event('voiceschanged'));
    }
    if (this._listeners['voiceschanged']) {
      this._listeners['voiceschanged'].forEach((l) => l(new Event('voiceschanged')));
    }
  }
}

let mockSynthesis: MockSpeechSynthesis;
let lastSpokenUtterance: MockSpeechSynthesisUtterance | null = null;
let spokenUtterances: MockSpeechSynthesisUtterance[] = [];

describe('speechService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSynthesis = new MockSpeechSynthesis();
    lastSpokenUtterance = null;
    spokenUtterances = [];

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynthesis,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockSpeechSynthesisUtterance,
      writable: true,
      configurable: true,
    });
    (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  });

  afterEach(() => {
    stopSpeaking();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('isSpeechSynthesisSupported', () => {
    it('returns true when window.speechSynthesis and SpeechSynthesisUtterance exist', () => {
      expect(isSpeechSynthesisSupported()).toBe(true);
    });

    it('returns false when window.speechSynthesis is undefined', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isSpeechSynthesisSupported()).toBe(false);
    });

    it('returns false when SpeechSynthesisUtterance is undefined', () => {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      (global as any).SpeechSynthesisUtterance = undefined;
      expect(isSpeechSynthesisSupported()).toBe(false);
    });
  });

  describe('SSR / Unsupported browser fallback', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    it('getAllVoices returns empty array', async () => {
      const voices = await getAllVoices();
      expect(voices).toEqual([]);
    });

    it('getPolishVoices returns empty array', async () => {
      const voices = await getPolishVoices();
      expect(voices).toEqual([]);
    });

    it('speakText reports that synthesis is unavailable', async () => {
      await expect(speakText('Dzień dobry')).resolves.toMatchObject({
        status: 'unavailable',
        attempts: 0,
      });
    });

    it('stopSpeaking does not throw', () => {
      expect(() => stopSpeaking()).not.toThrow();
    });

    it('isSpeaking returns false', () => {
      expect(isSpeaking()).toBe(false);
    });
  });

  describe('getAllVoices & getPolishVoices', () => {
    it('returns voices immediately when getVoices() is populated', async () => {
      const sampleVoices = [
        createMockVoice({ name: 'Zosia', lang: 'pl-PL', voiceURI: 'pl-1' }),
        createMockVoice({ name: 'John', lang: 'en-US', voiceURI: 'en-1' }),
      ];
      mockSynthesis.setVoices(sampleVoices);

      const voices = await getAllVoices();
      expect(voices).toEqual(sampleVoices);
      expect(mockSynthesis.getVoices).toHaveBeenCalled();
    });

    it('waits for onvoiceschanged when getVoices() initially returns empty array (Chrome/Android)', async () => {
      mockSynthesis.setVoices([]);

      const promise = getAllVoices();

      const laterVoices = [
        createMockVoice({ name: 'Maja', lang: 'pl_PL', voiceURI: 'pl-maja' }),
        createMockVoice({ name: 'Google polski', lang: 'pl-PL', voiceURI: 'pl-google' }),
      ];

      // Simulate async loading on Android/Chrome
      mockSynthesis.triggerVoicesChanged(laterVoices);

      const voices = await promise;
      expect(voices).toEqual(laterVoices);
    });

    it('resolves with fallback after timeout when onvoiceschanged never fires', async () => {
      mockSynthesis.setVoices([]);

      const promise = getAllVoices();

      // Fast-forward past fallback timeout (250ms)
      vi.advanceTimersByTime(300);

      const voices = await promise;
      expect(voices).toEqual([]);
    });

    it('restores original onvoiceschanged listener upon completion', async () => {
      mockSynthesis.setVoices([]);
      const customHandler = vi.fn();
      mockSynthesis.onvoiceschanged = customHandler;

      const promise = getAllVoices();
      mockSynthesis.triggerVoicesChanged([createMockVoice()]);
      await promise;

      expect(mockSynthesis.onvoiceschanged).toBe(customHandler);
    });

    it('filters Polish voices with various locale formats (pl-PL, pl_PL, pl)', async () => {
      const mixedVoices = [
        createMockVoice({ name: 'Voice EN', lang: 'en-US', voiceURI: 'en' }),
        createMockVoice({ name: 'Voice PL standard', lang: 'pl-PL', voiceURI: 'pl-std' }),
        createMockVoice({ name: 'Voice PL underscore', lang: 'pl_PL', voiceURI: 'pl-und' }),
        createMockVoice({ name: 'Voice PL short', lang: 'pl', voiceURI: 'pl-sh' }),
        createMockVoice({ name: 'Voice DE', lang: 'de-DE', voiceURI: 'de' }),
      ];
      mockSynthesis.setVoices(mixedVoices);

      const polishVoices = await getPolishVoices();
      expect(polishVoices.length).toBe(3);
      expect(polishVoices.map((v) => v.voiceURI)).toEqual(['pl-std', 'pl-und', 'pl-sh']);
    });

    it('prioritizes default Polish voice and exact pl-PL matches', async () => {
      const mixedVoices = [
        createMockVoice({ name: 'Voice PL short', lang: 'pl', voiceURI: 'pl-sh', default: false }),
        createMockVoice({ name: 'Voice PL standard', lang: 'pl-PL', voiceURI: 'pl-std', default: false }),
        createMockVoice({ name: 'Voice PL default', lang: 'pl-PL', voiceURI: 'pl-def', default: true }),
      ];
      mockSynthesis.setVoices(mixedVoices);

      const polishVoices = await getPolishVoices();
      expect(polishVoices[0].voiceURI).toBe('pl-def');
      expect(polishVoices[1].voiceURI).toBe('pl-std');
      expect(polishVoices[2].voiceURI).toBe('pl-sh');
    });
  });

  describe('speakText', () => {
    it('prepares speech synchronously during the user Start gesture', () => {
      expect(prepareSpeech()).toBe(true);
      expect(mockSynthesis.resume).toHaveBeenCalledTimes(1);
      expect(mockSynthesis.getVoices).toHaveBeenCalledTimes(1);
    });

    it('creates utterance, sets defaults and speaks', async () => {
      const plVoice = createMockVoice({ name: 'Zosia', lang: 'pl-PL', voiceURI: 'pl-zosia' });
      mockSynthesis.setVoices([plVoice]);

      const speakPromise = speakText('Jest godzina dwunasta zero zero');
      expect(mockSynthesis.cancel).not.toHaveBeenCalled();
      expect(mockSynthesis.resume).toHaveBeenCalledTimes(1);
      expect(mockSynthesis.speak).toHaveBeenCalled();
      expect(lastSpokenUtterance).not.toBeNull();
      expect(lastSpokenUtterance?.text).toBe('Jest godzina dwunasta zero zero');
      expect(lastSpokenUtterance?.lang).toBe('pl-PL');
      expect(lastSpokenUtterance?.rate).toBe(1.0);
      expect(lastSpokenUtterance?.pitch).toBe(1.0);
      expect(lastSpokenUtterance?.volume).toBe(1.0);
      expect(lastSpokenUtterance?.voice).toBe(plVoice);
      expect(isSpeaking()).toBe(true);

      // Simulate onend
      lastSpokenUtterance?.onend?.({} as SpeechSynthesisEvent);
      await expect(speakPromise).resolves.toMatchObject({
        status: 'completed',
        attempts: 1,
      });

      expect(isSpeaking()).toBe(false);
    });

    it('applies custom rate, pitch, and volume within bounds', async () => {
      const plVoice = createMockVoice({ voiceURI: 'pl-1' });
      mockSynthesis.setVoices([plVoice]);

      const options: SpeechOptions = {
        rate: 1.3,
        pitch: 0.9,
        volume: 0.75,
      };

      const speakPromise = speakText('Test', options);
      expect(lastSpokenUtterance?.rate).toBe(1.3);
      expect(lastSpokenUtterance?.pitch).toBe(0.9);
      expect(lastSpokenUtterance?.volume).toBe(0.75);

      lastSpokenUtterance?.onend?.({} as SpeechSynthesisEvent);
      await speakPromise;
    });

    it('clamps out-of-range rate, pitch, and volume values', async () => {
      const plVoice = createMockVoice();
      mockSynthesis.setVoices([plVoice]);

      const speakPromise = speakText('Test clamps', {
        rate: 5.0,    // max 2.0
        pitch: 3.0,   // max 1.5
        volume: 2.0,  // max 1.0
      });

      expect(lastSpokenUtterance?.rate).toBe(2.0);
      expect(lastSpokenUtterance?.pitch).toBe(1.5);
      expect(lastSpokenUtterance?.volume).toBe(1.0);

      lastSpokenUtterance?.onend?.({} as SpeechSynthesisEvent);
      await speakPromise;

      // Test lower bounds
      const speakPromise2 = speakText('Test lower bounds', {
        rate: 0.1,    // min 0.5
        pitch: 0.1,   // min 0.5
        volume: -1.0, // min 0.0
      });

      expect(lastSpokenUtterance?.rate).toBe(0.5);
      expect(lastSpokenUtterance?.pitch).toBe(0.5);
      expect(lastSpokenUtterance?.volume).toBe(0.0);

      lastSpokenUtterance?.onend?.({} as SpeechSynthesisEvent);
      await speakPromise2;
    });

    it('selects voice matching voiceURI when provided', async () => {
      const voice1 = createMockVoice({ name: 'Voice 1', voiceURI: 'v1' });
      const voice2 = createMockVoice({ name: 'Voice 2', voiceURI: 'v2' });
      mockSynthesis.setVoices([voice1, voice2]);

      const speakPromise = speakText('Test', { voiceURI: 'v2' });
      expect(lastSpokenUtterance?.voice).toBe(voice2);

      lastSpokenUtterance?.onend?.({} as SpeechSynthesisEvent);
      await speakPromise;
    });

    it('falls back to default non-Polish voice or first voice if no Polish voices exist', async () => {
      const defaultVoice = createMockVoice({ name: 'English Default', lang: 'en-US', voiceURI: 'en-def', default: true });
      const otherVoice = createMockVoice({ name: 'English Other', lang: 'en-US', voiceURI: 'en-other', default: false });
      mockSynthesis.setVoices([defaultVoice, otherVoice]);

      const speakPromise = speakText('Test');
      expect(lastSpokenUtterance?.voice).toBe(defaultVoice);
      expect(lastSpokenUtterance?.lang).toBe('pl-PL');

      lastSpokenUtterance?.onend?.({} as SpeechSynthesisEvent);
      await speakPromise;
    });

    it('reports an empty request without touching synthesis', async () => {
      await expect(speakText('')).resolves.toMatchObject({ status: 'empty', attempts: 0 });
      await expect(speakText('   ')).resolves.toMatchObject({ status: 'empty', attempts: 0 });
      expect(mockSynthesis.speak).not.toHaveBeenCalled();
    });

    it('reports a canceled utterance without treating it as a playback failure', async () => {
      const speakPromise = speakText('Komunikat przerwany');
      expect(isSpeaking()).toBe(true);

      lastSpokenUtterance?.onstart?.({} as SpeechSynthesisEvent);
      const cancelErrorEvent = { error: 'canceled' } as SpeechSynthesisErrorEvent;
      lastSpokenUtterance?.onerror?.(cancelErrorEvent);

      await expect(speakPromise).resolves.toMatchObject({
        status: 'cancelled',
        attempts: 1,
        errorCode: 'canceled',
      });
      expect(isSpeaking()).toBe(false);
    });

    it('retries when the engine cancels before confirming speech start', async () => {
      const speakPromise = speakText('Komunikat anulowany przed startem');
      spokenUtterances[0].onerror?.({ error: 'canceled' } as SpeechSynthesisErrorEvent);

      await vi.advanceTimersByTimeAsync(SPEECH_RETRY_DELAY_MS);
      expect(spokenUtterances).toHaveLength(2);

      spokenUtterances[1].onstart?.({} as SpeechSynthesisEvent);
      spokenUtterances[1].onend?.({} as SpeechSynthesisEvent);
      await expect(speakPromise).resolves.toMatchObject({
        status: 'completed',
        attempts: 2,
      });
    });

    it('reports not-started after both attempts are canceled before onstart', async () => {
      const speakPromise = speakText('Komunikat dwukrotnie anulowany');
      spokenUtterances[0].onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent);

      await vi.advanceTimersByTimeAsync(SPEECH_RETRY_DELAY_MS);
      spokenUtterances[1].onerror?.({ error: 'canceled' } as SpeechSynthesisErrorEvent);

      await expect(speakPromise).resolves.toMatchObject({
        status: 'not-started',
        attempts: 2,
        errorCode: 'canceled',
      });
    });

    it('reports an actual speech synthesis failure', async () => {
      const speakPromise = speakText('Komunikat z błędem');
      expect(isSpeaking()).toBe(true);

      const networkErrorEvent = { error: 'audio-busy' } as SpeechSynthesisErrorEvent;
      lastSpokenUtterance?.onerror?.(networkErrorEvent);

      await expect(speakPromise).resolves.toMatchObject({
        status: 'failed',
        attempts: 1,
        errorCode: 'audio-busy',
      });
      expect(isSpeaking()).toBe(false);
    });

    it('reports an unconfirmed completion when onstart fires but onend is lost', async () => {
      const speakPromise = speakText('Krótki tekst');
      expect(isSpeaking()).toBe(true);
      lastSpokenUtterance?.onstart?.({} as SpeechSynthesisEvent);

      // Advance timers past the calculated safety timeout
      await vi.advanceTimersByTimeAsync(10000);

      await expect(speakPromise).resolves.toMatchObject({
        status: 'started-unconfirmed',
        attempts: 1,
      });
      expect(isSpeaking()).toBe(false);
    });

    it('retries speech once when Android never reports onstart', async () => {
      const speakPromise = speakText('Jest godzina dwunasta');
      expect(spokenUtterances).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(SPEECH_START_TIMEOUT_MS + SPEECH_RETRY_DELAY_MS);

      expect(spokenUtterances).toHaveLength(2);
      expect(mockSynthesis.cancel).toHaveBeenCalledTimes(1);
      expect(mockSynthesis.resume).toHaveBeenCalledTimes(2);

      spokenUtterances[1].onstart?.({} as SpeechSynthesisEvent);
      spokenUtterances[1].onend?.({} as SpeechSynthesisEvent);

      await expect(speakPromise).resolves.toMatchObject({
        status: 'completed',
        attempts: 2,
      });
    });

    it('reports not-started after exactly one failed recovery attempt', async () => {
      const speakPromise = speakText('Jest godzina trzynasta');

      await vi.advanceTimersByTimeAsync(
        SPEECH_START_TIMEOUT_MS + SPEECH_RETRY_DELAY_MS + SPEECH_START_TIMEOUT_MS
      );

      await expect(speakPromise).resolves.toMatchObject({
        status: 'not-started',
        attempts: 2,
      });
      expect(mockSynthesis.speak).toHaveBeenCalledTimes(2);
      expect(mockSynthesis.cancel).toHaveBeenCalledTimes(2);
      expect(isSpeaking()).toBe(false);
    });

    it('cancels previous speech when new speakText is invoked and resolves immediately without leaking promise', async () => {
      const speakPromise1 = speakText('Pierwsza wypowiedź');
      expect(isSpeaking()).toBe(true);

      const speakPromise2 = speakText('Druga wypowiedź');

      // The second speak cancels previous
      expect(mockSynthesis.cancel).toHaveBeenCalledTimes(1);

      // speakPromise1 resolves immediately on cancel via stopSpeaking()
      await expect(speakPromise1).resolves.toMatchObject({ status: 'cancelled' });

      lastSpokenUtterance?.onend?.({} as SpeechSynthesisEvent);
      await speakPromise2;
      expect(isSpeaking()).toBe(false);
    });

    it('guards against execution if stopped while await getAllVoices() was pending', async () => {
      mockSynthesis.setVoices([]);
      const speakPromise = speakText('Wypowiedź z oczekiwaniem');

      // stopSpeaking is called before voices resolve
      stopSpeaking();

      // Now voices resolve
      mockSynthesis.triggerVoicesChanged([createMockVoice()]);
      await expect(speakPromise).resolves.toMatchObject({ status: 'cancelled' });
      // Should not have spoken utterance since it was cancelled during async voice resolution
      expect(mockSynthesis.speak).not.toHaveBeenCalled();
    });
  });

  describe('stopSpeaking & isSpeaking', () => {
    it('stopSpeaking cancels speech synthesis, updates isSpeaking, and resolves pending promise', async () => {
      const speakPromise = speakText('Długa wypowiedź');
      expect(isSpeaking()).toBe(true);

      stopSpeaking();
      expect(mockSynthesis.cancel).toHaveBeenCalled();
      expect(isSpeaking()).toBe(false);

      // Verify pending promise resolved cleanly
      await expect(speakPromise).resolves.toMatchObject({ status: 'cancelled' });
    });

    it('isSpeaking returns true if window.speechSynthesis.speaking is true', () => {
      mockSynthesis.speaking = true;
      expect(isSpeaking()).toBe(true);

      mockSynthesis.speaking = false;
      expect(isSpeaking()).toBe(false);
    });
  });
});
