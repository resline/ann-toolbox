/**
 * useSpeakingClock Hook
 *
 * Connects BackgroundTimerEngine to React UI state, persists user settings in localStorage,
 * preloads the immutable offline voice pack, and exposes clock actions.
 */

import { createContext, createElement, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import {
  type SpeakingClockSettings,
  type ClockState,
  type ClockMode,
  type TickPayload,
  type AnnouncementPayload,
  type DepartureSettings,
  type TimeTimerSettings,
  type SpeechOutcome,
  DEFAULT_SPEAKING_CLOCK_SETTINGS,
} from '../types';
import { createClockBackend, isNativeClock, type ClockBackend, type BackendStatus } from '../services/clockBackend';
import type { VoicePackFailureCode } from '../services/spriteSpeechPlayer';
import { playChime } from '../../../lib/audio/chime';

export const SPEAKING_CLOCK_STORAGE_KEY = 'ann_speaking_clock_settings';

/**
 * Tłumaczy zapis sprzed ujednolicenia nazw.
 *
 * Usuwa pola systemowego TTS, którego pakiet offline już nie używa, i zachowuje
 * nadal wspierane starsze nazwy głośności, gongu i blokady wygaszania.
 *
 * Wartość „legacy" wygrywa tylko wtedy, gdy kanonicznej nie ma — tak wygląda
 * zapis zrobiony przez starą wersję modalu.
 */
export function migrateStoredSettings(raw: unknown): Partial<SpeakingClockSettings> {
  if (!raw || typeof raw !== 'object') return {};
  const parsed = raw as Record<string, unknown>;

  const LEGACY_TO_CANONICAL: Record<string, keyof SpeakingClockSettings> = {
    speechVolume: 'volume',
    playChimeBefore: 'chimeEnabled',
    wakeLockEnabled: 'keepAwake',
  };

  const removedKeys = new Set(['voiceURI', 'rate', 'pitch', 'speechRate', 'speechPitch']);
  const migrated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key in LEGACY_TO_CANONICAL || removedKeys.has(key)) continue;
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
    return { ...DEFAULT_SPEAKING_CLOCK_SETTINGS, keepAwake: !isNativeClock() };
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
  return { ...DEFAULT_SPEAKING_CLOCK_SETTINGS, keepAwake: !isNativeClock() };
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
  backendStatus: BackendStatus;
  openBatterySettings: () => Promise<void>;
  exportDiagnostics: () => Promise<void>;
  currentTime: Date;
  nextAnnouncementTime: Date | null;
  secondsUntilNext: number;
  progress: number;
  settings: SpeakingClockSettings;
  lastAnnouncementText: string | null;
  focusRemainingSeconds?: number;
  elapsedSeconds: number;
  voicePackStatus: 'loading' | 'ready' | 'failed';
  voicePackFailureCode: VoicePackFailureCode | null;
  isTestingVoice: boolean;
  speechFailure: SpeechOutcome | null;
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
  retryVoicePack: () => Promise<void>;
  testChimeNow: (tone?: SpeakingClockSettings['chimeTone'], volume?: number) => Promise<void>;
  setIntervalMinutes: (minutes: number) => void;
  setMode: (mode: ClockMode) => void;
  addMinutes: (deltaMinutes: number) => void;
}

function useClockController(): UseSpeakingClockReturn {
  const [settings, setSettings] = useState<SpeakingClockSettings>(loadStoredSettings);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({ protection: isNativeClock() ? 'checking' : 'web', interrupted: false, error: null });
  const [clockState, setClockState] = useState<ClockState>('idle');
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [nextAnnouncementTime, setNextAnnouncementTime] = useState<Date | null>(null);
  const [secondsUntilNext, setSecondsUntilNext] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [lastAnnouncementText, setLastAnnouncementText] = useState<string | null>(null);
  const [focusRemainingSeconds, setFocusRemainingSeconds] = useState<number | undefined>(undefined);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [voicePackStatus, setVoicePackStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [voicePackFailureCode, setVoicePackFailureCode] = useState<VoicePackFailureCode | null>(null);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);
  const [speechFailure, setSpeechFailure] = useState<SpeechOutcome | null>(null);
  const [runningSecondsRemaining, setRunningSecondsRemaining] = useState<number | null>(null);
  const [runningTotalSpanSeconds, setRunningTotalSpanSeconds] = useState<number | null>(null);

  const engineRef = useRef<ClockBackend | null>(null);
  const settingsRef = useRef<SpeakingClockSettings>(settings);
  settingsRef.current = settings;

  // Initialize engine & callbacks
  useEffect(() => {
    const engine = createClockBackend(settingsRef.current, {
      onBackendStatus: setBackendStatus,
      onSettingsChange: (next) => {
        settingsRef.current = next;
        setSettings(next);
        persistSettings(next);
      },
      onError: (error) => {
        setBackendStatus(previous => ({ ...previous, error: error.message }));
      },
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
      onSpeechOutcome: (outcome: SpeechOutcome) => {
        if (outcome.status === 'failed') {
          setSpeechFailure(outcome);
        } else if (outcome.status === 'completed') {
          setSpeechFailure(null);
        }
      },
    });

    engineRef.current = engine;

    // Fetch, verify and decode the complete immutable voice sprite before Start.
    setVoicePackStatus('loading');
    engine.prepareVoicePack().then((result) => {
      if (engineRef.current !== engine) return;
      if (result.status === 'ready') {
        setVoicePackStatus('ready');
        setVoicePackFailureCode(null);
      } else {
        setVoicePackStatus('failed');
        setVoicePackFailureCode(result.code);
      }
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
    if (isNativeClock()) {
      engineRef.current?.updateSettings(partial);
      return;
    }
    const previous = settingsRef.current;
    const next: SpeakingClockSettings = {
      ...previous,
      ...partial,
      departure: {
        ...previous.departure,
        ...(partial.departure || {}),
      },
      timeTimer: {
        ...previous.timeTimer,
        ...(partial.timeTimer || {}),
      },
    };

    // Keep the ref ahead of the engine's synchronous onTick callback so live
    // interval changes calculate progress against the newly selected cadence.
    settingsRef.current = next;
    persistSettings(next);
    engineRef.current?.updateSettings(next);
    setSettings(next);
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
      if (isNativeClock()) {
        engineRef.current?.addMinutes(deltaMinutes);
        return;
      }
      if (engineRef.current && (clockState === 'running' || clockState === 'paused')) {
        engineRef.current.addMinutes(deltaMinutes);
        const updated = engineRef.current.getSettings();
        settingsRef.current = updated;
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

  const retryVoicePack = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setVoicePackStatus('loading');
    setVoicePackFailureCode(null);
    const result = await engine.prepareVoicePack(true);
    if (engineRef.current !== engine) return;
    if (result.status === 'ready') {
      setVoicePackStatus('ready');
      setVoicePackFailureCode(null);
      setSpeechFailure(null);
    } else {
      setVoicePackStatus('failed');
      setVoicePackFailureCode(result.code);
    }
  }, []);

  const testVoiceNow = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setIsTestingVoice(true);
    try {
      if (engine.getVoicePackState() !== 'ready') {
        setVoicePackStatus('loading');
        const result = await engine.prepareVoicePack(true);
        if (engineRef.current !== engine) return;
        if (result.status === 'failed') {
          setVoicePackStatus('failed');
          setVoicePackFailureCode(result.code);
          return;
        }
        setVoicePackStatus('ready');
        setVoicePackFailureCode(null);
      }
      await engine.triggerImmediateAnnouncement();
    } finally {
      if (engineRef.current === engine) setIsTestingVoice(false);
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
    backendStatus,
    openBatterySettings: async () => { await engineRef.current?.openBatterySettings?.(); },
    exportDiagnostics: async () => { await engineRef.current?.exportDiagnostics?.(); },
    clockState,
    currentTime,
    nextAnnouncementTime,
    secondsUntilNext,
    progress,
    settings,
    lastAnnouncementText,
    focusRemainingSeconds,
    elapsedSeconds,
    voicePackStatus,
    voicePackFailureCode,
    isTestingVoice,
    speechFailure,
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
    retryVoicePack,
    testChimeNow,
    setIntervalMinutes,
    setMode,
    addMinutes,
  };
}
const SpeakingClockContext = createContext<UseSpeakingClockReturn | null>(null);

export function SpeakingClockProvider({ children }: { children: ReactNode }) {
  const clock = useClockController();
  return createElement(SpeakingClockContext.Provider, { value: clock }, children);
}

export function useSpeakingClock(): UseSpeakingClockReturn {
  const clock = useContext(SpeakingClockContext);
  if (!clock) throw new Error('SpeakingClockProvider is required');
  return clock;
}
export default useSpeakingClock;
