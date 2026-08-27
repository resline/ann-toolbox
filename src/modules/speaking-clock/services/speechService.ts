/**
 * Serwis Syntezy Mowy PL (SpeechService)
 * 
 * Reliable Web Speech API service tailored for Polish TTS on Mobile (Android/Chrome) and Desktop.
 * Handles asynchronous voice loading on Android, priority matching for Polish voices,
 * robust error handling, cancellation, and safety fallback timeouts for Chrome browser bugs.
 */

export interface SpeechOptions {
  voiceURI?: string;
  rate?: number;    // default: 1.0 (range 0.5 - 2.0)
  pitch?: number;   // default: 1.0 (range 0.5 - 1.5)
  volume?: number;  // default: 1.0 (range 0.0 - 1.0)
}

let isCurrentlySpeaking = false;
let currentSafetyTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingVoicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/**
 * Checks whether Web Speech API (speechSynthesis and SpeechSynthesisUtterance) is supported in current environment.
 */
export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    Boolean(window.speechSynthesis) &&
    (typeof SpeechSynthesisUtterance !== 'undefined' ||
      Boolean((window as any).SpeechSynthesisUtterance || (globalThis as any).SpeechSynthesisUtterance))
  );
}

/**
 * Helper to clamp numeric options within valid ranges.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Checks if a language tag corresponds to Polish (pl, pl-PL, pl_PL, etc.).
 */
function isPolishLang(lang?: string): boolean {
  if (!lang) return false;
  const normalized = lang.toLowerCase().replace(/_/g, '-');
  return normalized.startsWith('pl');
}

/**
 * Sorts Polish voices: default voices first, then exact pl-PL matches, then alphabetically.
 */
function sortPolishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    if (a.default && !b.default) return -1;
    if (!a.default && b.default) return 1;

    const langA = (a.lang || '').toLowerCase().replace(/_/g, '-');
    const langB = (b.lang || '').toLowerCase().replace(/_/g, '-');

    if (langA === 'pl-pl' && langB !== 'pl-pl') return -1;
    if (langA !== 'pl-pl' && langB === 'pl-pl') return 1;

    return a.name.localeCompare(b.name);
  });
}

/**
 * Filters a list of voices for Polish language tags (pl-PL, pl_PL, pl).
 */
function filterPolishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const filtered = voices.filter((voice) => isPolishLang(voice.lang));
  return sortPolishVoices(filtered);
}

/**
 * Retrieves all available TTS voices.
 * Handles Android/Chrome asynchronous voice population via voiceschanged event and a fallback timeout.
 */
export function getAllVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSynthesisSupported()) {
    return Promise.resolve([]);
  }

  const existingVoices = window.speechSynthesis.getVoices();
  if (existingVoices && existingVoices.length > 0) {
    return Promise.resolve(existingVoices);
  }

  if (pendingVoicesPromise) {
    return pendingVoicesPromise;
  }

  pendingVoicesPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleVoicesChanged = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        if (window.speechSynthesis.onvoiceschanged === handleVoicesChanged) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      }
      pendingVoicesPromise = null;
      resolve(window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    };

    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged, { once: true });
    }

    const prevOnVoicesChanged = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = (ev) => {
      if (typeof prevOnVoicesChanged === 'function') {
        prevOnVoicesChanged.call(window.speechSynthesis, ev);
      }
      handleVoicesChanged();
    };

    // Fallback timeout in case onvoiceschanged never fires (e.g. headless/desktop browsers without async delay)
    timeoutId = setTimeout(() => {
      handleVoicesChanged();
    }, 250);
  });

  return pendingVoicesPromise;
}

/**
 * Retrieves Polish voices (matching pl-PL, pl_PL, pl).
 * Prioritizes default Polish voice and exact pl-PL locale matches.
 */
export async function getPolishVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await getAllVoices();
  return filterPolishVoices(voices);
}

/**
 * Checks whether speech synthesis is currently active or queued.
 */
export function isSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) {
    return false;
  }
  return isCurrentlySpeaking || window.speechSynthesis.speaking || window.speechSynthesis.pending;
}

/**
 * Stops any active or queued speech synthesis immediately.
 */
export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) {
    return;
  }
  if (currentSafetyTimeout !== null) {
    clearTimeout(currentSafetyTimeout);
    currentSafetyTimeout = null;
  }
  isCurrentlySpeaking = false;
  window.speechSynthesis.cancel();
}

/**
 * Synthesizes and speaks text in Polish (or requested voice) with custom rate/pitch/volume options.
 * Returns a Promise that resolves when speech completes or is safely terminated.
 */
export async function speakText(text: string, options: SpeechOptions = {}): Promise<void> {
  if (!isSpeechSynthesisSupported()) {
    return Promise.resolve();
  }

  if (!text || text.trim() === '') {
    return Promise.resolve();
  }

  // Stop previous speech to prevent overlapping or blocked queues
  stopSpeaking();
  isCurrentlySpeaking = true;

  let voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    voices = await getAllVoices();
  }

  let selectedVoice: SpeechSynthesisVoice | undefined;

  if (options.voiceURI) {
    selectedVoice = voices.find((v) => v.voiceURI === options.voiceURI);
  }

  if (!selectedVoice) {
    const polishVoices = filterPolishVoices(voices);
    if (polishVoices.length > 0) {
      selectedVoice = polishVoices[0];
    } else {
      selectedVoice = voices.find((v) => v.default) || voices[0];
    }
  }

  const UtteranceConstructor =
    window.SpeechSynthesisUtterance || (globalThis as any).SpeechSynthesisUtterance;
  const utterance = new UtteranceConstructor(text);

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = isPolishLang(selectedVoice.lang) ? selectedVoice.lang : 'pl-PL';
  } else {
    utterance.lang = 'pl-PL';
  }

  const rate = clamp(options.rate ?? 1.0, 0.5, 2.0);
  const pitch = clamp(options.pitch ?? 1.0, 0.5, 1.5);
  const volume = clamp(options.volume ?? 1.0, 0.0, 1.0);

  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      if (currentSafetyTimeout !== null) {
        clearTimeout(currentSafetyTimeout);
        currentSafetyTimeout = null;
      }
      isCurrentlySpeaking = false;
      utterance.onend = null;
      utterance.onerror = null;
    };

    // Safety timeout: Chrome occasionally drops onend event on background/long speech
    const estimatedDurationMs = Math.max(5000, ((text.length * 150) / rate) + 3000);
    currentSafetyTimeout = setTimeout(() => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      cleanup();
      resolve();
    }, estimatedDurationMs);

    utterance.onend = () => {
      cleanup();
      resolve();
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      cleanup();
      if (event.error === 'canceled' || event.error === 'interrupted') {
        resolve();
      } else {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}
