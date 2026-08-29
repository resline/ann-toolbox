/**
 * Serwis Syntezy Mowy PL (SpeechService)
 * 
 * Reliable Web Speech API service tailored for Polish TTS on Mobile (Android/Chrome) and Desktop.
 * Handles asynchronous voice loading on Android, priority matching for Polish voices,
 * robust error handling, cancellation, and safety fallback timeouts for Chrome browser bugs.
 */

import type { SpeechOutcome } from '../types';

export interface SpeechOptions {
  voiceURI?: string;
  rate?: number;    // default: 1.0 (range 0.5 - 2.0)
  pitch?: number;   // default: 1.0 (range 0.5 - 1.5)
  volume?: number;  // default: 1.0 (range 0.0 - 1.0)
}

export const SPEECH_START_TIMEOUT_MS = 4_000;
export const SPEECH_RETRY_DELAY_MS = 250;

const MAX_SPEECH_ATTEMPTS = 2;

interface ActiveSpeechOperation {
  generation: number;
  attempts: number;
  settled: boolean;
  started: boolean;
  utterance: SpeechSynthesisUtterance | null;
  startTimeout: ReturnType<typeof setTimeout> | null;
  completionTimeout: ReturnType<typeof setTimeout> | null;
  retryTimeout: ReturnType<typeof setTimeout> | null;
  resolve: (outcome: SpeechOutcome) => void;
}

let isCurrentlySpeaking = false;
let currentOperation: ActiveSpeechOperation | null = null;
let pendingVoicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let speechGeneration = 0;

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

function getVisibilityState(): SpeechOutcome['visibilityState'] {
  return typeof document === 'undefined' ? 'unknown' : document.visibilityState;
}

function createOutcome(
  status: SpeechOutcome['status'],
  attempts: number,
  errorCode?: string
): SpeechOutcome {
  return {
    status,
    attempts,
    ...(errorCode ? { errorCode } : {}),
    visibilityState: getVisibilityState(),
  };
}

/**
 * Warms up the browser speech engine synchronously from a user gesture.
 * Android/Chrome is more likely to retain permission to start later speech when
 * resume() and getVoices() are invoked directly from the Start button handler.
 */
export function prepareSpeech(): boolean {
  if (!isSpeechSynthesisSupported()) {
    return false;
  }

  try {
    window.speechSynthesis.resume();
    window.speechSynthesis.getVoices();
    return true;
  } catch {
    return false;
  }
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
    const originalOnVoicesChanged = window.speechSynthesis ? window.speechSynthesis.onvoiceschanged : null;

    const handleVoicesChanged = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (window.speechSynthesis) {
        if (window.speechSynthesis.removeEventListener) {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        }
        window.speechSynthesis.onvoiceschanged = originalOnVoicesChanged;
      }
      pendingVoicesPromise = null;
      resolve(window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    };

    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged, { once: true });
    }

    window.speechSynthesis.onvoiceschanged = (ev) => {
      if (typeof originalOnVoicesChanged === 'function') {
        originalOnVoicesChanged.call(window.speechSynthesis, ev);
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

function clearOperationTimers(operation: ActiveSpeechOperation): void {
  if (operation.startTimeout !== null) {
    clearTimeout(operation.startTimeout);
    operation.startTimeout = null;
  }
  if (operation.completionTimeout !== null) {
    clearTimeout(operation.completionTimeout);
    operation.completionTimeout = null;
  }
  if (operation.retryTimeout !== null) {
    clearTimeout(operation.retryTimeout);
    operation.retryTimeout = null;
  }
}

function detachUtterance(operation: ActiveSpeechOperation): void {
  if (!operation.utterance) {
    return;
  }

  operation.utterance.onstart = null;
  operation.utterance.onend = null;
  operation.utterance.onerror = null;
  operation.utterance = null;
}

function finishOperation(operation: ActiveSpeechOperation, outcome: SpeechOutcome): void {
  if (operation.settled) {
    return;
  }

  operation.settled = true;
  clearOperationTimers(operation);
  detachUtterance(operation);

  if (currentOperation === operation) {
    currentOperation = null;
    isCurrentlySpeaking = false;
  }

  operation.resolve(outcome);
}

function cancelCurrentOperation(errorCode = 'cancelled'): void {
  speechGeneration += 1;

  const operation = currentOperation;
  if (operation) {
    finishOperation(
      operation,
      createOutcome('cancelled', operation.attempts, errorCode)
    );
  }

  isCurrentlySpeaking = false;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Stops any active or queued speech synthesis immediately and resolves any pending utterance promise.
 */
export function stopSpeaking(): void {
  cancelCurrentOperation();
}

function selectVoice(
  voices: SpeechSynthesisVoice[],
  requestedVoiceURI?: string
): SpeechSynthesisVoice | undefined {
  if (requestedVoiceURI) {
    const requestedVoice = voices.find((voice) => voice.voiceURI === requestedVoiceURI);
    if (requestedVoice) {
      return requestedVoice;
    }
  }

  const polishVoices = filterPolishVoices(voices);
  return polishVoices[0] || voices.find((voice) => voice.default) || voices[0];
}

function recoverUnstartedAttempt(
  operation: ActiveSpeechOperation,
  text: string,
  options: SpeechOptions,
  selectedVoice: SpeechSynthesisVoice | undefined,
  errorCode?: string
): void {
  if (operation.startTimeout !== null) {
    clearTimeout(operation.startTimeout);
    operation.startTimeout = null;
  }

  // Invalidate handlers before cancel(); some Android engines dispatch a
  // delayed "canceled" event for the discarded utterance.
  detachUtterance(operation);
  window.speechSynthesis.cancel();

  if (operation.attempts < MAX_SPEECH_ATTEMPTS) {
    operation.retryTimeout = setTimeout(() => {
      operation.retryTimeout = null;
      beginSpeechAttempt(operation, text, options, selectedVoice);
    }, SPEECH_RETRY_DELAY_MS);
    return;
  }

  finishOperation(
    operation,
    createOutcome('not-started', operation.attempts, errorCode)
  );
}

function beginSpeechAttempt(
  operation: ActiveSpeechOperation,
  text: string,
  options: SpeechOptions,
  selectedVoice: SpeechSynthesisVoice | undefined
): void {
  if (
    operation.settled ||
    currentOperation !== operation ||
    operation.generation !== speechGeneration
  ) {
    return;
  }

  operation.attempts += 1;
  operation.started = false;

  const UtteranceConstructor =
    window.SpeechSynthesisUtterance || (globalThis as any).SpeechSynthesisUtterance;
  const utterance: SpeechSynthesisUtterance = new UtteranceConstructor(text);
  operation.utterance = utterance;

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = isPolishLang(selectedVoice.lang) ? selectedVoice.lang : 'pl-PL';
  } else {
    utterance.lang = 'pl-PL';
  }

  const rate = clamp(options.rate ?? 1.0, 0.5, 2.0);
  utterance.rate = rate;
  utterance.pitch = clamp(options.pitch ?? 1.0, 0.5, 1.5);
  utterance.volume = clamp(options.volume ?? 1.0, 0.0, 1.0);

  const isCurrentUtterance = () =>
    !operation.settled &&
    currentOperation === operation &&
    operation.utterance === utterance;

  utterance.onstart = () => {
    if (!isCurrentUtterance()) {
      return;
    }

    operation.started = true;
    if (operation.startTimeout !== null) {
      clearTimeout(operation.startTimeout);
      operation.startTimeout = null;
    }

    // Chrome occasionally drops onend in the background. Once onstart was
    // observed, a missing onend is not a start failure, only an unconfirmed end.
    const estimatedDurationMs = Math.max(5_000, ((text.length * 150) / rate) + 3_000);
    operation.completionTimeout = setTimeout(() => {
      if (!isCurrentUtterance()) {
        return;
      }

      detachUtterance(operation);
      window.speechSynthesis.cancel();
      finishOperation(
        operation,
        createOutcome('started-unconfirmed', operation.attempts)
      );
    }, estimatedDurationMs);
  };

  utterance.onend = () => {
    if (!isCurrentUtterance()) {
      return;
    }
    finishOperation(operation, createOutcome('completed', operation.attempts));
  };

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    if (!isCurrentUtterance()) {
      return;
    }

    const errorCode = event.error || 'unknown';
    if (
      !operation.started &&
      (errorCode === 'canceled' || errorCode === 'interrupted')
    ) {
      recoverUnstartedAttempt(
        operation,
        text,
        options,
        selectedVoice,
        errorCode
      );
      return;
    }

    const status = errorCode === 'canceled' || errorCode === 'interrupted'
      ? 'cancelled'
      : 'failed';
    finishOperation(operation, createOutcome(status, operation.attempts, errorCode));
  };

  operation.startTimeout = setTimeout(() => {
    if (!isCurrentUtterance() || operation.started) {
      return;
    }

    recoverUnstartedAttempt(operation, text, options, selectedVoice);
  }, SPEECH_START_TIMEOUT_MS);

  try {
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    const errorCode = error instanceof Error ? error.name : 'speak-threw';
    finishOperation(operation, createOutcome('failed', operation.attempts, errorCode));
  }
}

/**
 * Synthesizes and speaks text in Polish (or requested voice) with custom rate/pitch/volume options.
 * Returns a structured outcome after completion, cancellation, failure, or one
 * controlled retry when the browser never confirms that playback started.
 */
export function speakText(
  text: string,
  options: SpeechOptions = {}
): Promise<SpeechOutcome> {
  if (!isSpeechSynthesisSupported()) {
    return Promise.resolve(createOutcome('unavailable', 0));
  }

  if (!text || text.trim() === '') {
    return Promise.resolve(createOutcome('empty', 0));
  }

  if (
    currentOperation ||
    window.speechSynthesis.speaking ||
    window.speechSynthesis.pending
  ) {
    cancelCurrentOperation('replaced');
  }

  speechGeneration += 1;
  const generation = speechGeneration;
  isCurrentlySpeaking = true;

  return new Promise<SpeechOutcome>((resolve) => {
    const operation: ActiveSpeechOperation = {
      generation,
      attempts: 0,
      settled: false,
      started: false,
      utterance: null,
      startTimeout: null,
      completionTimeout: null,
      retryTimeout: null,
      resolve,
    };
    currentOperation = operation;

    const prepareAndSpeak = async () => {
      try {
        let voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) {
          voices = await getAllVoices();
        }

        if (
          operation.settled ||
          currentOperation !== operation ||
          operation.generation !== speechGeneration
        ) {
          return;
        }

        beginSpeechAttempt(operation, text, options, selectVoice(voices, options.voiceURI));
      } catch (error) {
        if (!operation.settled) {
          const errorCode = error instanceof Error ? error.name : 'voice-load-failed';
          finishOperation(operation, createOutcome('failed', operation.attempts, errorCode));
        }
      }
    };

    void prepareAndSpeak();
  });
}
