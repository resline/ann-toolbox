/**
 * useSpeakingClock Hook
 *
 * Connects BackgroundTimerEngine to React UI state, persists user settings in localStorage,
 * tracks voice synthesis list, and exposes simple actions (start/pause/resume/stop/test).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  type SpeakingClockSettings,
  type ClockState,
  type ClockMode,
  type TickPayload,
  type AnnouncementPayload,
  DEFAULT_SPEAKING_CLOCK_SETTINGS,
} from '../types';
import { BackgroundTimerEngine } from '../services/backgroundTimerEngine';
import { getPolishVoices } from '../services/speechService';
import { playChime } from '../services/chimeSynthesizer';

export const SPEAKING_CLOCK_STORAGE_KEY = 'ann_speaking_clock_settings';

/**
 * Safely loads saved settings from localStorage.
 */
function loadStoredSettings(): SpeakingClockSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SPEAKING_CLOCK_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SPEAKING_CLOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SPEAKING_CLOCK_SETTINGS,
        ...parsed,
      };
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return DEFAULT_SPEAKING_CLOCK_SETTINGS;
}

/**
 * Safely saves settings to localStorage.
 */
function persistSettings(settings: SpeakingClockSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SPEAKING_CLOCK_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage write errors (e.g. quota exceeded)
  }
}

export interface UseSpeakingClockReturn {
  clockState: ClockState;
  currentTime: Date;
  nextAnnouncementTime: Date | null;
  secondsUntilNext: number;
  progress: number;
  settings: SpeakingClockSettings;
  lastAnnouncementText: string | null;
  focusRemainingSeconds?: number;
  elapsedSeconds: number;
  availableVoices: SpeechSynthesisVoice[];
  isLoadingVoices: boolean;
  isTestingVoice: boolean;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  updateSettings: (partial: Partial<SpeakingClockSettings>) => void;
  testVoiceNow: () => Promise<void>;
  testChimeNow: (tone?: SpeakingClockSettings['chimeTone'], volume?: number) => Promise<void>;
  setIntervalMinutes: (minutes: number) => void;
  setMode: (mode: ClockMode) => void;
}

export function useSpeakingClock(): UseSpeakingClockReturn {
  const [settings, setSettings] = useState<SpeakingClockSettings>(loadStoredSettings);
  const [clockState, setClockState] = useState<ClockState>('idle');
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [nextAnnouncementTime, setNextAnnouncementTime] = useState<Date | null>(null);
  const [secondsUntilNext, setSecondsUntilNext] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [lastAnnouncementText, setLastAnnouncementText] = useState<string | null>(null);
  const [focusRemainingSeconds, setFocusRemainingSeconds] = useState<number | undefined>(undefined);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(true);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  const engineRef = useRef<BackgroundTimerEngine | null>(null);
  const settingsRef = useRef<SpeakingClockSettings>(settings);
  settingsRef.current = settings;

  // Initialize engine & callbacks
  useEffect(() => {
    const engine = new BackgroundTimerEngine(settingsRef.current, {
      onTick: (payload: TickPayload) => {
        setCurrentTime(payload.currentTime);
        setElapsedSeconds(payload.elapsedSeconds);
        setSecondsUntilNext(payload.remainingSecondsToNextAnnouncement);
        setNextAnnouncementTime(payload.nextAnnouncementTime);
        setFocusRemainingSeconds(payload.focusRemainingSeconds);

        if (settingsRef.current.mode === 'focus') {
          setProgress(payload.progressPercent ?? 0);
        } else {
          // In continuous interval mode, calculate progress through current interval
          const totalIntervalSec = Math.max(1, settingsRef.current.intervalMinutes * 60);
          const remainingSec = payload.remainingSecondsToNextAnnouncement;
          const completedSec = Math.max(0, totalIntervalSec - remainingSec);
          const calcProgress = Math.min(100, Math.max(0, (completedSec / totalIntervalSec) * 100));
          setProgress(calcProgress);
        }
      },
      onStateChange: (state: ClockState) => {
        setClockState(state);
        if (state === 'idle') {
          setNextAnnouncementTime(null);
          setSecondsUntilNext(0);
          setProgress(0);
          setFocusRemainingSeconds(undefined);
          setElapsedSeconds(0);
        }
      },
      onAnnounce: (payload: AnnouncementPayload) => {
        setLastAnnouncementText(payload.text);
      },
    });

    engineRef.current = engine;

    // Load available Polish TTS voices
    setIsLoadingVoices(true);
    getPolishVoices()
      .then((voices) => {
        setAvailableVoices(voices);
      })
      .catch(() => {
        setAvailableVoices([]);
      })
      .finally(() => {
        setIsLoadingVoices(false);
      });

    // Idle wall-clock ticker when engine is not actively ticking
    const idleTicker = setInterval(() => {
      if (engineRef.current?.getState() === 'idle') {
        setCurrentTime(new Date());
      }
    }, 1000);

    return () => {
      clearInterval(idleTicker);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.start();
    }
  }, []);

  const pause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
  }, []);

  const resume = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.resume();
    }
  }, []);

  const stop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<SpeakingClockSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      persistSettings(next);
      engineRef.current?.updateSettings(next);
      return next;
    });
  }, []);

  const setIntervalMinutes = useCallback(
    (minutes: number) => {
      updateSettings({ intervalMinutes: minutes });
    },
    [updateSettings]
  );

  const setMode = useCallback(
    (mode: ClockMode) => {
      updateSettings({ mode });
    },
    [updateSettings]
  );

  const testVoiceNow = useCallback(async () => {
    if (!engineRef.current) return;
    setIsTestingVoice(true);
    try {
      await engineRef.current.triggerImmediateAnnouncement();
    } finally {
      setIsTestingVoice(false);
    }
  }, []);

  const testChimeNow = useCallback(
    async (tone?: SpeakingClockSettings['chimeTone'], volume?: number) => {
      const activeTone = tone ?? settingsRef.current.chimeTone;
      const activeVol = volume ?? settingsRef.current.chimeVolume;
      await playChime({ tone: activeTone, volume: activeVol });
    },
    []
  );

  return {
    clockState,
    currentTime,
    nextAnnouncementTime,
    secondsUntilNext,
    progress,
    settings,
    lastAnnouncementText,
    focusRemainingSeconds,
    elapsedSeconds,
    availableVoices,
    isLoadingVoices,
    isTestingVoice,
    start,
    pause,
    resume,
    stop,
    updateSettings,
    testVoiceNow,
    testChimeNow,
    setIntervalMinutes,
    setMode,
  };
}
