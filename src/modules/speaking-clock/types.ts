/**
 * Speaking Clock (Głos Czasu) Type Definitions
 */

export type ClockMode = 'continuous' | 'focus';

export type TimeFormatStyle = 'precise' | 'natural' | 'short' | 'elapsed';

export type ChimeTone = 'gentle' | 'warm' | 'bright';

export type ClockState = 'idle' | 'running' | 'paused';

export type AnnouncementReason = 'interval' | 'manual' | 'session_end';

export interface SpeakingClockSettings {
  /** Announcement interval in minutes (e.g. 1, 2, 5, 10, 15, 20, 30, 60) */
  intervalMinutes: number;
  /** Clock mode: continuous speaking clock or bounded focus (Pomodoro) session */
  mode: ClockMode;
  /** Voice formatting style for time announcement */
  formatStyle: TimeFormatStyle;
  /** Whether to play a harmonic chime before speaking */
  playChimeBefore: boolean;
  /** Chime sound tone variant */
  chimeTone: ChimeTone;
  /** Chime volume level (0.0 to 1.0) */
  chimeVolume: number;
  /** Speech synthesis voice URI (optional, pl-PL default selected if omitted) */
  voiceURI?: string;
  /** Speech rate (0.5 to 2.0) */
  speechRate: number;
  /** Speech pitch (0.5 to 1.5) */
  speechPitch: number;
  /** Speech volume (0.0 to 1.0) */
  speechVolume: number;
  /** When true, aligns intervals to wall-clock (:00, :15, :30...). When false, counts from session start */
  clockSync: boolean;
  /** Session duration limit in minutes for focus mode (e.g. 25) */
  focusDurationMinutes: number;
  /** Whether to keep screen awake via Screen Wake Lock API */
  wakeLockEnabled: boolean;
}

export const DEFAULT_SPEAKING_CLOCK_SETTINGS: SpeakingClockSettings = {
  intervalMinutes: 15,
  mode: 'continuous',
  formatStyle: 'natural',
  playChimeBefore: true,
  chimeTone: 'gentle',
  chimeVolume: 0.7,
  voiceURI: undefined,
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  clockSync: true,
  focusDurationMinutes: 25,
  wakeLockEnabled: false,
};

export interface TickPayload {
  state: ClockState;
  currentTime: Date;
  elapsedSeconds: number;
  remainingSecondsToNextAnnouncement: number;
  nextAnnouncementTime: Date | null;
  focusRemainingSeconds?: number;
  progressPercent?: number;
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
