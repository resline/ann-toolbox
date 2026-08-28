/**
 * useSpeakingClock Hook
 *
 * Connects BackgroundTimerEngine to React UI state, persists user settings in localStorage,
 * tracks voice synthesis list, and exposes simple actions (start/pause/resume/stop/test/adjust).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  type SpeakingClockSettings,
  type ClockState,
  type ClockMode,
  type TickPayload,
  type AnnouncementPayload,
  type DepartureSettings,
  type TimeTimerSettings,
  DEFAULT_SPEAKING_CLOCK_SETTINGS,
} from '../types';
import { BackgroundTimerEngine } from '../services/backgroundTimerEngine';
import { getPolishVoices } from '../services/speechService';
import { playChime } from '../../../lib/audio/chime';

export const SPEAKING_CLOCK_STORAGE_KEY = 'ann_speaking_clock_settings';

/**
 * Tłumaczy zapis sprzed ujednolicenia nazw.
 *
 * Do tej pory ten sam parametr istniał pod dwiema nazwami naraz
 * (speechRate/rate, playChimeBefore/chimeEnabled, wakeLockEnabled/keepAwake),
 * a silnik czytał wariant „legacy". Bez tego kroku usunięcie duplikatów
 * zresetowałoby zapisane ustawienia głosu do domyślnych.
 *
 * Wartość „legacy" wygrywa tylko wtedy, gdy kanonicznej nie ma — tak wygląda
 * zapis zrobiony przez starą wersję modalu.
 */
export function migrateStoredSettings(raw: unknown): Partial<SpeakingClockSettings> {
  if (!raw || typeof raw !== 'object') return {};
  const parsed = raw as Record<string, unknown>;

  const LEGACY_TO_CANONICAL: Record<string, keyof SpeakingClockSettings> = {
    speechRate: 'rate',
    speechPitch: 'pitch',
    speechVolume: 'volume',
    playChimeBefore: 'chimeEnabled',
    wakeLockEnabled: 'keepAwake',
  };

  const migrated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key in LEGACY_TO_CANONICAL) continue;
    migrated[key] = value;
  }
  for (const [legacy, canonical] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (parsed[canonical] === undefined && parsed[legacy] !== undefined) {
      migrated[canonical] = parsed[legacy];
    }
  }

  return migrated as Partial<SpeakingClockSettings>;
}

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
      const parsed = migrateStoredSettings(JSON.parse(raw)) as Record<string, unknown>;
      return {
        ...DEFAULT_SPEAKING_CLOCK_SETTINGS,
        ...parsed,
        departure: {
          ...DEFAULT_SPEAKING_CLOCK_SETTINGS.departure,
          ...(parsed.departure || {}),
        },
        timeTimer: {
          ...DEFAULT_SPEAKING_CLOCK_SETTINGS.timeTimer,
          ...(parsed.timeTimer || {}),
        },
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

/**
 * Calculates remaining seconds between now and target HH:MM time.
 */
function calcDepartureRemainingSeconds(targetTimeStr: string, now: Date): number {
  const [hStr, mStr] = (targetTimeStr || '08:30').split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (target.getTime() < now.getTime() - 60 * 1000) {
    target.setDate(target.getDate() + 1);
  }
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
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
  totalSpanSeconds: number;
  secondsRemaining: number;
  departureLabel: string;
  targetTime: string;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  updateSettings: (partial: Partial<SpeakingClockSettings>) => void;
  setDepartureSettings: (settings: Partial<DepartureSettings>) => void;
  setTimeTimerSettings: (settings: Partial<TimeTimerSettings>) => void;
  testVoiceNow: () => Promise<void>;
  testChimeNow: (tone?: SpeakingClockSettings['chimeTone'], volume?: number) => Promise<void>;
  setIntervalMinutes: (minutes: number) => void;
  setMode: (mode: ClockMode) => void;
  addMinutes: (deltaMinutes: number) => void;
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
  const [runningSecondsRemaining, setRunningSecondsRemaining] = useState<number | null>(null);
  const [runningTotalSpanSeconds, setRunningTotalSpanSeconds] = useState<number | null>(null);

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

        if (payload.secondsRemaining !== undefined) {
          setRunningSecondsRemaining(payload.secondsRemaining);
        }
        if (payload.totalSeconds !== undefined) {
          setRunningTotalSpanSeconds(payload.totalSeconds);
        }

        if (settingsRef.current.mode === 'focus') {
          setProgress(payload.progressPercent ?? 0);
        } else if (settingsRef.current.mode === 'departure') {
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
          setRunningSecondsRemaining(null);
          setRunningTotalSpanSeconds(null);
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
      const next = {
        ...prev,
        ...partial,
        departure: {
          ...prev.departure,
          ...(partial.departure || {}),
        },
        timeTimer: {
          ...prev.timeTimer,
          ...(partial.timeTimer || {}),
        },
      };
      persistSettings(next);
      engineRef.current?.updateSettings(next);
      return next;
    });
  }, []);

  const setDepartureSettings = useCallback(
    (partial: Partial<DepartureSettings>) => {
      updateSettings({ departure: { ...settingsRef.current.departure, ...partial } });
    },
    [updateSettings]
  );

  const setTimeTimerSettings = useCallback(
    (partial: Partial<TimeTimerSettings>) => {
      updateSettings({ timeTimer: { ...settingsRef.current.timeTimer, ...partial } });
    },
    [updateSettings]
  );

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

  const addMinutes = useCallback(
    (deltaMinutes: number) => {
      if (engineRef.current && (clockState === 'running' || clockState === 'paused')) {
        engineRef.current.addMinutes(deltaMinutes);
        const updated = engineRef.current.getSettings();
        setSettings(updated);
        persistSettings(updated);
      } else {
        // Idle mode adjustments
        setSettings((prev) => {
          let next = { ...prev };
          if (prev.mode === 'departure') {
            const [hStr, mStr] = (prev.departure?.targetTime || '08:30').split(':');
            let totalMins =
              (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0) + deltaMinutes;
            totalMins = ((totalMins % 1440) + 1440) % 1440;
            const h = String(Math.floor(totalMins / 60)).padStart(2, '0');
            const m = String(totalMins % 60).padStart(2, '0');
            next = {
              ...next,
              departure: {
                ...next.departure,
                targetTime: `${h}:${m}`,
              },
            };
          } else if (prev.mode === 'focus') {
            next = {
              ...next,
              focusDurationMinutes: Math.max(
                1,
                (prev.focusDurationMinutes || 25) + deltaMinutes
              ),
            };
          } else {
            next = {
              ...next,
              intervalMinutes: Math.max(1, (prev.intervalMinutes || 5) + deltaMinutes),
            };
          }
          persistSettings(next);
          engineRef.current?.updateSettings(next);
          return next;
        });
      }
    },
    [clockState]
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

  // Calculate dynamic totalSpanSeconds & secondsRemaining for TimeTimerDisc
  const departureLabel = settings.departure?.label || 'Wyjście z domu';
  const targetTime = settings.departure?.targetTime || '08:30';

  const { totalSpanSeconds, secondsRemaining } = useMemo(() => {
    if (settings.mode === 'departure') {
      if (clockState === 'running' || clockState === 'paused') {
        const remaining = runningSecondsRemaining ?? 0;
        const total = runningTotalSpanSeconds ?? Math.max(1, remaining);
        return {
          totalSpanSeconds: total,
          secondsRemaining: remaining,
        };
      }
      const idleRemaining = calcDepartureRemainingSeconds(targetTime, currentTime);
      return {
        totalSpanSeconds: Math.max(60, idleRemaining),
        secondsRemaining: idleRemaining,
      };
    }

    if (settings.mode === 'focus') {
      const total = (settings.focusDurationMinutes || 25) * 60;
      if (clockState === 'running' || clockState === 'paused') {
        return {
          totalSpanSeconds: total,
          secondsRemaining: focusRemainingSeconds ?? total,
        };
      }
      return {
        totalSpanSeconds: total,
        secondsRemaining: total,
      };
    }

    // Continuous mode
    const total = 3600; // 60 min disc
    const remaining = clockState === 'running' ? secondsUntilNext : settings.intervalMinutes * 60;
    return {
      totalSpanSeconds: total,
      secondsRemaining: remaining,
    };
  }, [
    settings.mode,
    settings.focusDurationMinutes,
    settings.intervalMinutes,
    targetTime,
    currentTime,
    clockState,
    runningSecondsRemaining,
    runningTotalSpanSeconds,
    focusRemainingSeconds,
    secondsUntilNext,
  ]);

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
    totalSpanSeconds,
    secondsRemaining,
    departureLabel,
    targetTime,
    start,
    pause,
    resume,
    stop,
    updateSettings,
    setDepartureSettings,
    setTimeTimerSettings,
    testVoiceNow,
    testChimeNow,
    setIntervalMinutes,
    setMode,
    addMinutes,
  };
}
export default useSpeakingClock;
