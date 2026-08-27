/**
 * Background Timer Engine (Silnik Działania w Tle)
 *
 * Core coordinator for Speaking Clock (Głos Czasu):
 * - Coordinates background intervals via dedicated Web Worker and fallback timers.
 * - Handles wall-clock aligned intervals (:00, :15, :30...) and elapsed session timing.
 * - Manages Focus (Pomodoro) and Continuous modes.
 * - Executes sound sequences: harmonic chime -> Polish time synthesis -> voice playback.
 * - Integrates with Screen Wake Lock API, Silent Audio keep-alive loop, and MediaSession API.
 */

import {
  type SpeakingClockSettings,
  type ClockState,
  type TickPayload,
  type AnnouncementPayload,
  type EngineCallbacks,
  DEFAULT_SPEAKING_CLOCK_SETTINGS,
} from '../types';
import {
  formatPolishTime,
  formatDepartureAnnouncement,
} from './polishTimeFormatter';
import { playChime } from './chimeSynthesizer';
import { speakText, stopSpeaking } from './speechService';
import { WakeLockService } from './wakeLockService';
import { SilentAudioLoop } from './silentAudioLoop';
import { createTimerWorker } from './timerWorker';

/**
 * Calculates the next target timestamp for announcements.
 *
 * @param currentTime Current date/time
 * @param intervalMinutes Interval in minutes (e.g. 5, 10, 15, 30, 60)
 * @param clockSync When true, aligns target to clock minutes divisible by interval. When false, relative to baseTime.
 * @param baseTime Base start or last announcement date used when clockSync is false.
 */
export function calculateNextAnnouncementTime(
  currentTime: Date,
  intervalMinutes: number,
  clockSync: boolean,
  baseTime?: Date
): Date {
  const interval = Math.max(1, intervalMinutes || 15);

  if (!clockSync) {
    const origin = baseTime || currentTime;
    return new Date(origin.getTime() + interval * 60 * 1000);
  }

  // Wall-clock alignment
  const curMs = currentTime.getTime();

  if (interval <= 60) {
    const curM = currentTime.getMinutes();

    const bucket = Math.floor(curM / interval);
    let nextMinute = (bucket + 1) * interval;

    let target = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate(),
      currentTime.getHours(),
      nextMinute,
      0,
      0
    );

    // If target timestamp is not strictly in the future, advance to next interval
    if (target.getTime() <= curMs) {
      nextMinute += interval;
      target = new Date(
        currentTime.getFullYear(),
        currentTime.getMonth(),
        currentTime.getDate(),
        currentTime.getHours(),
        nextMinute,
        0,
        0
      );
    }

    return target;
  }

  // Intervals larger than 60 minutes (aligned from 00:00 start of day)
  const dayStart = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    currentTime.getDate(),
    0,
    0,
    0,
    0
  );
  const totalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const bucket = Math.floor(totalMinutes / interval);
  let nextTotalMin = (bucket + 1) * interval;

  let target = new Date(dayStart.getTime() + nextTotalMin * 60 * 1000);
  if (target.getTime() <= curMs) {
    nextTotalMin += interval;
    target = new Date(dayStart.getTime() + nextTotalMin * 60 * 1000);
  }

  return target;
}

export class BackgroundTimerEngine {
  private settings: SpeakingClockSettings;
  private callbacks: EngineCallbacks;
  private state: ClockState = 'idle';

  private startTime: number | null = null;
  private lastAnnouncementTime: number | null = null;
  private lastAnnouncedTargetTime: number | null = null;
  private pauseStartTime: number | null = null;
  private totalPausedDuration = 0;
  private nextAnnouncementTime: Date | null = null;

  private departureTargetTimestamp: number | null = null;
  private departureInitialSeconds: number | null = null;
  private triggeredMilestones = new Set<number>();

  private worker: Worker | null = null;
  private fallbackIntervalId: ReturnType<typeof setInterval> | null = null;
  private wakeLockService: WakeLockService;
  private silentAudioLoop: SilentAudioLoop;
  private isAnnouncing = false;

  constructor(
    settings?: Partial<SpeakingClockSettings>,
    callbacks?: EngineCallbacks
  ) {
    this.settings = {
      ...DEFAULT_SPEAKING_CLOCK_SETTINGS,
      ...settings,
    };
    this.callbacks = callbacks || {};
    this.wakeLockService = new WakeLockService();
    this.silentAudioLoop = new SilentAudioLoop();
  }

  /**
   * Returns current clock state.
   */
  getState(): ClockState {
    return this.state;
  }

  /**
   * Returns copy of current engine settings.
   */
  getSettings(): SpeakingClockSettings {
    return { ...this.settings };
  }

  /**
   * Returns current departure target time string (e.g. "08:30") or null.
   */
  getDepartureTargetTime(): string | null {
    return this.settings.departure?.targetTime ?? null;
  }

  /**
   * Sets departure target time and optional label, recalculating target timestamp.
   */
  setDepartureTarget(targetTime: string, label?: string): void {
    this.settings.departure = {
      ...this.settings.departure,
      targetTime,
      ...(label !== undefined ? { label } : {}),
    };

    const now = new Date();
    this.departureTargetTimestamp = this.calculateDepartureTargetTimestamp(targetTime, now);
    if (this.state === 'running' && this.startTime) {
      const remaining = Math.max(0, Math.floor((this.departureTargetTimestamp - now.getTime()) / 1000));
      this.departureInitialSeconds = Math.max(1, remaining);
      this.triggeredMilestones.clear();
      const milestones = this.getDepartureMilestones();
      for (const m of milestones) {
        if (m * 60 >= remaining) {
          this.triggeredMilestones.add(m);
        }
      }
    }
    this.updateMediaSessionMetadata();
  }

  /**
   * Adjusts duration/interval/departure target by delta minutes (+/-).
   */
  addMinutes(deltaMinutes: number): void {
    const now = Date.now();
    if (this.settings.mode === 'departure') {
      if (this.departureTargetTimestamp === null) {
        this.departureTargetTimestamp = this.calculateDepartureTargetTimestamp(
          this.settings.departure.targetTime,
          new Date(now)
        );
      }
      this.departureTargetTimestamp += deltaMinutes * 60 * 1000;
      const targetDate = new Date(this.departureTargetTimestamp);
      const h = String(targetDate.getHours()).padStart(2, '0');
      const m = String(targetDate.getMinutes()).padStart(2, '0');
      this.settings.departure.targetTime = `${h}:${m}`;

      if (this.departureInitialSeconds !== null) {
        this.departureInitialSeconds = Math.max(1, this.departureInitialSeconds + deltaMinutes * 60);
      }

      const secondsRemaining = Math.max(
        0,
        Math.floor((this.departureTargetTimestamp - now) / 1000)
      );

      // Re-enable milestones that are back in the future
      for (const milestone of Array.from(this.triggeredMilestones)) {
        if (secondsRemaining > milestone * 60) {
          this.triggeredMilestones.delete(milestone);
        }
      }
      // Mark passed milestones as triggered
      const milestones = this.getDepartureMilestones();
      for (const milestone of milestones) {
        if (milestone * 60 > secondsRemaining) {
          this.triggeredMilestones.add(milestone);
        }
      }

      this.updateMediaSessionMetadata();
      if (this.state === 'running') {
        this.handleTick(now);
      }
    } else if (this.settings.mode === 'focus') {
      this.settings.focusDurationMinutes = Math.max(
        1,
        this.settings.focusDurationMinutes + deltaMinutes
      );
      if (this.state === 'running') {
        this.handleTick(now);
      }
    } else {
      // Continuous mode
      this.settings.intervalMinutes = Math.max(
        1,
        this.settings.intervalMinutes + deltaMinutes
      );
      if (this.state === 'running') {
        this.nextAnnouncementTime = calculateNextAnnouncementTime(
          new Date(now),
          this.settings.intervalMinutes,
          this.settings.clockSync,
          this.lastAnnouncementTime ? new Date(this.lastAnnouncementTime) : new Date(now)
        );
        this.handleTick(now);
      }
    }
  }

  /**
   * Calculates departure target timestamp from targetTime string and reference date.
   */
  private calculateDepartureTargetTimestamp(targetTime: string, now: Date): number {
    const [hStr, mStr] = (targetTime || '08:30').split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;

    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m,
      0,
      0
    );

    // If target timestamp for today is more than 1 minute in the past, roll over to tomorrow
    if (targetDate.getTime() < now.getTime() - 60 * 1000) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    return targetDate.getTime();
  }

  /**
   * Returns sorted descending list of departure milestones in minutes.
   */
  private getDepartureMilestones(): number[] {
    if (this.settings.departure.smartDensity) {
      return [120, 90, 60, 45, 30, 20, 15, 10, 5, 4, 3, 2, 1, 0];
    }
    if (
      this.settings.departure.customMilestonesMinutes &&
      this.settings.departure.customMilestonesMinutes.length > 0
    ) {
      const set = new Set(this.settings.departure.customMilestonesMinutes);
      set.add(0);
      return Array.from(set).sort((a, b) => b - a);
    }
    // Fixed interval mode (e.g. 1, 2, 3, 5, 10, 15 min)
    const interval = Math.max(1, Math.floor(this.settings.departure.intervalMinutes || 2));
    const maxMinutes = 720; // Up to 12 hours countdown
    const milestones: number[] = [];
    for (let m = 0; m <= maxMinutes; m += interval) {
      milestones.push(m);
    }
    return milestones.sort((a, b) => b - a);
  }

  /**
   * Calculates next milestone date for departure countdown.
   */
  private calculateNextDepartureMilestoneTime(
    timestamp: number,
    secondsRemaining: number
  ): Date | null {
    if (secondsRemaining <= 0) {
      return null;
    }
    const milestones = this.getDepartureMilestones();
    for (const m of milestones) {
      const milestoneSec = m * 60;
      if (milestoneSec < secondsRemaining && !this.triggeredMilestones.has(m)) {
        const diffSec = secondsRemaining - milestoneSec;
        return new Date(timestamp + diffSec * 1000);
      }
    }
    return new Date(timestamp + secondsRemaining * 1000);
  }

  /**
   * Starts the speaking clock engine.
   */
  async start(): Promise<void> {
    if (this.state === 'running') {
      return;
    }

    if (this.state === 'paused') {
      await this.resume();
      return;
    }

    const now = Date.now();
    this.startTime = now;
    this.lastAnnouncementTime = now;
    this.lastAnnouncedTargetTime = null;
    this.pauseStartTime = null;
    this.totalPausedDuration = 0;

    if (this.settings.mode === 'departure') {
      this.departureTargetTimestamp = this.calculateDepartureTargetTimestamp(
        this.settings.departure.targetTime,
        new Date(now)
      );
      const initialSecondsRemaining = Math.max(
        0,
        Math.floor((this.departureTargetTimestamp - now) / 1000)
      );
      this.departureInitialSeconds = Math.max(1, initialSecondsRemaining);
      this.triggeredMilestones.clear();
      const milestones = this.getDepartureMilestones();
      for (const m of milestones) {
        if (m * 60 >= initialSecondsRemaining) {
          this.triggeredMilestones.add(m);
        }
      }
      this.nextAnnouncementTime = this.calculateNextDepartureMilestoneTime(
        now,
        initialSecondsRemaining
      );
    } else {
      this.nextAnnouncementTime = calculateNextAnnouncementTime(
        new Date(now),
        this.settings.intervalMinutes,
        this.settings.clockSync,
        new Date(now)
      );
    }

    this.setState('running');
    this.startTimerLoop();

    // Background keep-alive & screen wake lock
    await this.silentAudioLoop.start();
    if (this.settings.wakeLockEnabled) {
      await this.wakeLockService.request();
    }

    this.setupMediaSession();
    this.handleTick(now);
  }

  /**
   * Pauses the engine.
   */
  pause(): void {
    if (this.state !== 'running') {
      return;
    }

    this.pauseStartTime = Date.now();
    this.setState('paused');
    this.updateMediaSessionState('paused');
  }

  /**
   * Resumes the paused engine.
   */
  async resume(): Promise<void> {
    if (this.state !== 'paused') {
      return;
    }

    const now = Date.now();
    let pausedDuration = 0;
    if (this.pauseStartTime !== null) {
      pausedDuration = now - this.pauseStartTime;
      this.totalPausedDuration += pausedDuration;
      this.pauseStartTime = null;
    }

    // Shift relative target by the duration the engine was paused
    if (!this.settings.clockSync && this.nextAnnouncementTime) {
      this.nextAnnouncementTime = new Date(
        this.nextAnnouncementTime.getTime() + pausedDuration
      );
    }

    this.setState('running');

    await this.silentAudioLoop.start();
    if (this.settings.wakeLockEnabled) {
      await this.wakeLockService.request();
    }

    this.updateMediaSessionState('playing');
    this.handleTick(now);
  }

  /**
   * Stops the engine and resets session state.
   */
  stop(): void {
    if (this.state === 'idle') {
      return;
    }

    this.setState('idle');
    this.stopTimerLoop();

    this.wakeLockService.release().catch(() => {});
    this.silentAudioLoop.stop();
    stopSpeaking();

    this.updateMediaSessionState('none');

    this.startTime = null;
    this.lastAnnouncementTime = null;
    this.lastAnnouncedTargetTime = null;
    this.pauseStartTime = null;
    this.totalPausedDuration = 0;
    this.nextAnnouncementTime = null;
    this.departureTargetTimestamp = null;
    this.departureInitialSeconds = null;
    this.triggeredMilestones.clear();
  }

  /**
   * Permanently stops and cleans up engine resources.
   */
  destroy(): void {
    this.stop();
    this.clearMediaSession();
  }

  /**
   * Updates partial settings dynamically.
   */
  updateSettings(settings: Partial<SpeakingClockSettings>): void {
    const prevWakeLock = this.settings.wakeLockEnabled;
    const prevMode = this.settings.mode;
    const prevTarget = this.settings.departure?.targetTime;

    this.settings = {
      ...this.settings,
      ...settings,
      departure: {
        ...this.settings.departure,
        ...(settings.departure || {}),
      },
      timeTimer: {
        ...this.settings.timeTimer,
        ...(settings.timeTimer || {}),
      },
    };

    if (
      this.settings.mode === 'departure' &&
      (prevMode !== 'departure' || prevTarget !== this.settings.departure.targetTime)
    ) {
      const now = new Date();
      this.departureTargetTimestamp = this.calculateDepartureTargetTimestamp(
        this.settings.departure.targetTime,
        now
      );
      if (this.state === 'running' && this.startTime) {
        const remaining = Math.max(
          0,
          Math.floor((this.departureTargetTimestamp - now.getTime()) / 1000)
        );
        this.departureInitialSeconds = Math.max(1, remaining);
        this.triggeredMilestones.clear();
        const milestones = this.getDepartureMilestones();
        for (const m of milestones) {
          if (m * 60 >= remaining) {
            this.triggeredMilestones.add(m);
          }
        }
      }
    }

    if (this.state === 'running') {
      const now = Date.now();
      if (this.settings.mode === 'departure') {
        const secondsRemaining = Math.max(
          0,
          Math.floor(((this.departureTargetTimestamp ?? now) - now) / 1000)
        );
        this.nextAnnouncementTime = this.calculateNextDepartureMilestoneTime(
          now,
          secondsRemaining
        );
      } else {
        this.nextAnnouncementTime = calculateNextAnnouncementTime(
          new Date(now),
          this.settings.intervalMinutes,
          this.settings.clockSync,
          this.lastAnnouncementTime ? new Date(this.lastAnnouncementTime) : new Date(now)
        );
      }

      if (this.settings.wakeLockEnabled && !prevWakeLock) {
        this.wakeLockService.request().catch(() => {});
      } else if (!this.settings.wakeLockEnabled && prevWakeLock) {
        this.wakeLockService.release().catch(() => {});
      }

      this.updateMediaSessionMetadata();
    }
  }

  /**
   * Manually triggers an immediate voice time announcement.
   */
  async triggerImmediateAnnouncement(): Promise<void> {
    const now = new Date();
    const elapsedMs = this.startTime
      ? Date.now() - this.startTime - this.totalPausedDuration
      : 0;
    const elapsedMinutes = Math.floor(Math.max(0, elapsedMs) / 60000);

    const text = formatPolishTime(now, this.settings.formatStyle, {
      elapsedMinutes,
      isSessionEnd: false,
    });

    const payload: AnnouncementPayload = {
      text,
      timestamp: now,
      elapsedMinutes,
      isFocusEnd: false,
      reason: 'manual',
    };

    this.callbacks.onAnnounce?.(payload);
    await this.executeAudioSequence(text);
  }

  /**
   * Internal state transition handler.
   */
  private setState(nextState: ClockState): void {
    if (this.state === nextState) return;
    this.state = nextState;
    this.callbacks.onStateChange?.(nextState);
  }

  /**
   * Starts timer loop with Web Worker and fallback interval.
   */
  private startTimerLoop(): void {
    this.stopTimerLoop();

    // 1. Dedicated Web Worker
    try {
      this.worker = createTimerWorker();
      if (this.worker) {
        this.worker.onmessage = (e: MessageEvent) => {
          if (e.data?.type === 'TICK') {
            this.handleTick(e.data.timestamp || Date.now());
          }
        };
        this.worker.postMessage({ type: 'START', intervalMs: 250 });
      }
    } catch {
      this.worker = null;
    }

    // 2. Main thread interval (ensures compatibility with fake timers and fallback environments)
    this.fallbackIntervalId = setInterval(() => {
      this.handleTick(Date.now());
    }, 250);
  }

  /**
   * Stops timer worker and interval.
   */
  private stopTimerLoop(): void {
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'STOP' });
        this.worker.terminate();
      } catch {
        // Ignore worker termination errors
      }
      this.worker = null;
    }

    if (this.fallbackIntervalId !== null) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
    }
  }

  /**
   * Core tick calculation and announcement triggering logic.
   */
  private handleTick(timestamp: number): void {
    const now = new Date(timestamp);

    const elapsedMs =
      this.state === 'running'
        ? timestamp - (this.startTime ?? timestamp) - this.totalPausedDuration
        : this.pauseStartTime
        ? this.pauseStartTime - (this.startTime ?? timestamp) - this.totalPausedDuration
        : 0;

    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    let focusRemainingSeconds: number | undefined;
    let progressPercent: number | undefined;
    let isFocusEnd = false;
    let secondsRemaining: number | undefined;
    let totalSeconds: number | undefined;

    if (this.settings.mode === 'departure') {
      if (this.departureTargetTimestamp === null) {
        this.departureTargetTimestamp = this.calculateDepartureTargetTimestamp(
          this.settings.departure.targetTime,
          now
        );
      }

      secondsRemaining = Math.max(
        0,
        Math.floor((this.departureTargetTimestamp - timestamp) / 1000)
      );
      totalSeconds = this.departureInitialSeconds ?? Math.max(1, secondsRemaining);
      const elapsedInDeparture = Math.max(0, totalSeconds - secondsRemaining);
      progressPercent = Math.min(100, Math.max(0, (elapsedInDeparture / totalSeconds) * 100));

      const targetDate = new Date(this.departureTargetTimestamp);
      const milestones = this.getDepartureMilestones();

      if (this.state === 'running' && !this.isAnnouncing) {
        for (const m of milestones) {
          const milestoneSec = m * 60;
          if (secondsRemaining <= milestoneSec && !this.triggeredMilestones.has(m)) {
            this.triggeredMilestones.add(m);

            if (secondsRemaining <= 0 || m === 0) {
              const text = formatDepartureAnnouncement(
                0,
                this.settings.departure.label,
                targetDate,
                true
              );
              const payload: AnnouncementPayload = {
                text,
                timestamp: now,
                elapsedMinutes,
                isFocusEnd: false,
                reason: 'session_end',
              };
              this.callbacks.onAnnounce?.(payload);
              this.executeAudioSequence(text).then(() => {
                this.stop();
              });
            } else {
              const text = formatDepartureAnnouncement(
                secondsRemaining,
                this.settings.departure.label,
                targetDate,
                false
              );
              const payload: AnnouncementPayload = {
                text,
                timestamp: now,
                elapsedMinutes,
                isFocusEnd: false,
                reason: 'interval',
              };
              this.callbacks.onAnnounce?.(payload);
              this.executeAudioSequence(text);
            }
            break;
          }
        }
      }

      this.nextAnnouncementTime = this.calculateNextDepartureMilestoneTime(
        timestamp,
        secondsRemaining
      );
    } else if (this.settings.mode === 'focus') {
      const focusTotalSec = this.settings.focusDurationMinutes * 60;
      focusRemainingSeconds = Math.max(0, focusTotalSec - elapsedSeconds);
      totalSeconds = focusTotalSec;
      secondsRemaining = focusRemainingSeconds;
      progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / focusTotalSec) * 100));

      if (elapsedSeconds >= focusTotalSec) {
        isFocusEnd = true;
      }
    }

    if (this.settings.mode !== 'departure') {
      // Check announcement conditions if running
      if (this.state === 'running' && !this.isAnnouncing) {
        if (isFocusEnd) {
          this.triggerFocusEndAnnouncement(now, elapsedMinutes);
        } else if (
          this.nextAnnouncementTime &&
          timestamp >= this.nextAnnouncementTime.getTime()
        ) {
          const targetMs = this.nextAnnouncementTime.getTime();
          // Prevent duplicate trigger for the same interval
          if (this.lastAnnouncedTargetTime !== targetMs) {
            this.lastAnnouncedTargetTime = targetMs;
            this.triggerIntervalAnnouncement(now, elapsedMinutes);
            this.lastAnnouncementTime = timestamp;
            this.nextAnnouncementTime = calculateNextAnnouncementTime(
              now,
              this.settings.intervalMinutes,
              this.settings.clockSync,
              new Date(timestamp)
            );
          }
        }
      }
    }

    let remainingSecondsToNextAnnouncement = 0;
    if (this.nextAnnouncementTime) {
      remainingSecondsToNextAnnouncement = Math.max(
        0,
        Math.ceil((this.nextAnnouncementTime.getTime() - timestamp) / 1000)
      );
    }

    const payload: TickPayload = {
      state: this.state,
      currentTime: now,
      elapsedSeconds,
      remainingSecondsToNextAnnouncement,
      nextAnnouncementTime: this.nextAnnouncementTime,
      focusRemainingSeconds,
      progressPercent,
      secondsRemaining:
        this.settings.mode === 'departure'
          ? secondsRemaining
          : this.settings.mode === 'focus'
          ? focusRemainingSeconds
          : undefined,
      totalSeconds:
        this.settings.mode === 'departure'
          ? totalSeconds
          : this.settings.mode === 'focus'
          ? this.settings.focusDurationMinutes * 60
          : undefined,
      targetTime: this.settings.departure?.targetTime,
      departureLabel: this.settings.departure?.label,
    };

    this.callbacks.onTick?.(payload);
  }

  /**
   * Triggers scheduled interval announcement.
   */
  private triggerIntervalAnnouncement(now: Date, elapsedMinutes: number): void {
    const text = formatPolishTime(now, this.settings.formatStyle, {
      elapsedMinutes,
      isSessionEnd: false,
    });

    const payload: AnnouncementPayload = {
      text,
      timestamp: now,
      elapsedMinutes,
      isFocusEnd: false,
      reason: 'interval',
    };

    this.callbacks.onAnnounce?.(payload);
    this.executeAudioSequence(text);
  }

  /**
   * Triggers focus session completion announcement and stops engine.
   */
  private triggerFocusEndAnnouncement(now: Date, elapsedMinutes: number): void {
    const text = formatPolishTime(now, 'elapsed', {
      elapsedMinutes,
      isSessionEnd: true,
    });

    const payload: AnnouncementPayload = {
      text,
      timestamp: now,
      elapsedMinutes,
      isFocusEnd: true,
      reason: 'session_end',
    };

    this.callbacks.onAnnounce?.(payload);
    this.executeAudioSequence(text).then(() => {
      this.stop();
    });
  }

  /**
   * Executes the audio sequence: gentle chime (if enabled) followed by voice synthesis.
   */
  private async executeAudioSequence(text: string): Promise<void> {
    this.isAnnouncing = true;
    try {
      if (this.settings.playChimeBefore) {
        await playChime({
          volume: this.settings.chimeVolume,
          tone: this.settings.chimeTone,
        });
      }

      await speakText(text, {
        voiceURI: this.settings.voiceURI,
        rate: this.settings.speechRate,
        pitch: this.settings.speechPitch,
        volume: this.settings.speechVolume,
      });
    } catch (err) {
      this.callbacks.onError?.(err as Error);
    } finally {
      this.isAnnouncing = false;
    }
  }

  /**
   * Sets up MediaSession metadata and controls.
   */
  private setupMediaSession(): void {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      !navigator.mediaSession
    ) {
      return;
    }

    try {
      this.updateMediaSessionMetadata();
      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('play', () => {
        if (this.state === 'paused') {
          this.resume();
        } else if (this.state === 'idle') {
          this.start();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.state === 'running') {
          this.pause();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        this.stop();
      });
    } catch {
      // Ignore media session errors
    }
  }

  /**
   * Updates MediaSession metadata based on active mode.
   */
  private updateMediaSessionMetadata(): void {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      !navigator.mediaSession
    ) {
      return;
    }

    try {
      let title = 'Głos Czasu - Narzędziownik Ani';
      let album = 'Zegar Mówiący';

      if (this.settings.mode === 'departure') {
        const label = this.settings.departure.label || 'Wyjście';
        const now = Date.now();
        const secondsRemaining = this.departureTargetTimestamp
          ? Math.max(0, Math.floor((this.departureTargetTimestamp - now) / 1000))
          : 0;
        const minutesRemaining = Math.ceil(secondsRemaining / 60);

        title =
          secondsRemaining <= 0
            ? `Czas na: ${label}`
            : `Za ${minutesRemaining} min: ${label}`;
        album = 'Kotwica Czasu (Wyjście)';
      } else if (this.settings.mode === 'focus') {
        album = 'Tryb Skupienia (Pomodoro)';
      }

      const metadataObj = {
        title,
        artist: 'Narzędziownik Ani',
        album,
      };

      const MediaMetadataClass =
        (typeof window !== 'undefined' && (window as any).MediaMetadata) ||
        (typeof globalThis !== 'undefined' && (globalThis as any).MediaMetadata);

      navigator.mediaSession.metadata = MediaMetadataClass
        ? new MediaMetadataClass(metadataObj)
        : (metadataObj as any);
    } catch {
      // Ignore errors
    }
  }

  /**
   * Updates MediaSession playbackState.
   */
  private updateMediaSessionState(state: 'none' | 'paused' | 'playing'): void {
    if (
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator &&
      navigator.mediaSession
    ) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Cleans up MediaSession metadata and action handlers.
   */
  private clearMediaSession(): void {
    if (
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator &&
      navigator.mediaSession
    ) {
      try {
        navigator.mediaSession.playbackState = 'none';
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch {
        // Ignore errors
      }
    }
  }
}
