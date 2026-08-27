/**
 * Kotwica Czasu (Speaking Clock & Time Anchor) Type Definitions
 */

export type ClockMode = 'continuous' | 'focus' | 'departure';

export type TimeTimerColor = 'sage' | 'amber' | 'lavender' | 'rose' | 'ocean';

export type TimeFormatStyle = 'precise' | 'natural' | 'short' | 'elapsed';

export type ChimeTone = 'gentle' | 'warm' | 'bright';

export type ClockState = 'idle' | 'running' | 'paused';

export type AnnouncementReason = 'interval' | 'manual' | 'session_end';

export interface DepartureSettings {
  targetTime: string; // HH:MM (e.g. "08:30")
  label: string; // e.g. "Wyjście z domu"
  smartDensity: boolean;
  customMilestonesMinutes?: number[];
}

export interface TimeTimerSettings {
  enabled: boolean;
  color: TimeTimerColor;
  showNumbers: boolean;
  direction: 'clockwise' | 'counter-clockwise';
}

export interface SpeakingClockSettings {
  /** Announcement interval in minutes (e.g. 1, 2, 5, 10, 15, 20, 30, 60) */
  intervalMinutes: number;
  /** When true, aligns intervals to wall-clock (:00, :15, :30...). When false, counts from session start */
  clockSync: boolean;
  /** Voice formatting style for time announcement */
  formatStyle: TimeFormatStyle;
  /** Speech synthesis voice URI (pl-PL default selected if empty) */
  voiceURI: string;
  /** Speech rate (0.5 to 2.0) */
  rate: number;
  /** Speech pitch (0.5 to 1.5) */
  pitch: number;
  /** Speech volume (0.0 to 1.0) */
  volume: number;
  /** Whether to play a harmonic chime before speaking */
  chimeEnabled: boolean;
  /** Chime sound tone variant */
  chimeTone: ChimeTone;
  /** Chime volume level (0.0 to 1.0) */
  chimeVolume: number;
  /** Clock mode: continuous speaking clock, bounded focus session, or departure countdown */
  mode: ClockMode;
  /** Session duration limit in minutes for focus mode (e.g. 25) */
  focusDurationMinutes: number;
  /** Departure mode settings */
  departure: DepartureSettings;
  /** Visual Time Timer settings */
  timeTimer: TimeTimerSettings;
  /** Whether to keep screen awake via Screen Wake Lock API */
  keepAwake: boolean;

  /** Legacy / compatibility aliases */
  speechRate?: number;
  speechPitch?: number;
  speechVolume?: number;
  playChimeBefore?: boolean;
  wakeLockEnabled?: boolean;
}

export const DEFAULT_SPEAKING_CLOCK_SETTINGS: SpeakingClockSettings = {
  intervalMinutes: 5,
  clockSync: true,
  formatStyle: 'natural',
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  chimeEnabled: true,
  chimeTone: 'gentle',
  chimeVolume: 0.7,
  mode: 'continuous',
  focusDurationMinutes: 25,
  departure: {
    targetTime: '08:30',
    label: 'Wyjście z domu',
    smartDensity: true,
  },
  timeTimer: {
    enabled: true,
    color: 'sage',
    showNumbers: true,
    direction: 'counter-clockwise',
  },
  keepAwake: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  playChimeBefore: true,
  wakeLockEnabled: true,
};

export interface TickPayload {
  state: ClockState;
  currentTime: Date;
  elapsedSeconds: number;
  remainingSecondsToNextAnnouncement: number;
  nextAnnouncementTime: Date | null;
  focusRemainingSeconds?: number;
  progressPercent?: number;
  secondsRemaining?: number;
  totalSeconds?: number;
  targetTime?: string;
  departureLabel?: string;
}

export interface AnnouncementPayload {
  text: string;
  timestamp: Date;
  elapsedMinutes: number;
  isFocusEnd?: boolean;
  reason: AnnouncementReason;
}

export interface EngineCallbacks {
  onTick?: (payload: TickPayload) => void;
  onStateChange?: (state: ClockState) => void;
  onAnnounce?: (payload: AnnouncementPayload) => void;
  onError?: (error: Error) => void;
}

export type WorkerIncomingMessage =
  | { type: 'START'; intervalMs?: number }
  | { type: 'STOP' }
  | { type: 'RESET' };

export type WorkerOutgoingMessage =
  | { type: 'TICK'; timestamp: number };
