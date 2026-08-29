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
  type SpeechOutcome,
  DEFAULT_SPEAKING_CLOCK_SETTINGS,
} from '../types';
import {
  planDepartureAnnouncement,
  planTimeAnnouncement,
  type AnnouncementPlan,
} from './polishAnnouncementPlanner';
import { scheduleChime, type ScheduledChime } from '../../../lib/audio/chime';
import {
  SpriteSpeechPlayer,
  type ScheduledVoiceSequence,
  type VoicePackPreparation,
} from './spriteSpeechPlayer';
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
  private lastAnnouncedTargetTime: number | null = null;
  private pauseStartTime: number | null = null;
  private totalPausedDuration = 0;
  private nextAnnouncementTime: Date | null = null;
  private resetCadenceOnResume = false;

  private departureTargetTimestamp: number | null = null;
  private departureInitialSeconds: number | null = null;
  private triggeredMilestones = new Set<number>();

  private worker: Worker | null = null;
  private fallbackIntervalId: ReturnType<typeof setInterval> | null = null;
  private wakeLockService: WakeLockService;
  private silentAudioLoop: SilentAudioLoop;
  private spriteSpeechPlayer: SpriteSpeechPlayer;
  private scheduledVoice: ScheduledVoiceSequence | null = null;
  private scheduledChime: ScheduledChime | null = null;
  private isAnnouncing = false;
  private audioSequenceGeneration = 0;
  private lifecycleGeneration = 0;
  private manualAnnouncementGeneration = 0;
  private focusEndAnnouncementPending = false;
  private destroyed = false;

  constructor(
    settings?: Partial<SpeakingClockSettings>,
    callbacks?: EngineCallbacks,
    spriteSpeechPlayer?: SpriteSpeechPlayer
  ) {
    this.settings = {
      ...DEFAULT_SPEAKING_CLOCK_SETTINGS,
      ...settings,
    };
    this.callbacks = callbacks || {};
    this.wakeLockService = new WakeLockService();
    this.spriteSpeechPlayer = spriteSpeechPlayer ?? new SpriteSpeechPlayer();
    this.silentAudioLoop = new SilentAudioLoop(this.spriteSpeechPlayer.getAudioContext());
  }

  prepareVoicePack(forceRefresh = false): Promise<VoicePackPreparation> {
    if (this.destroyed) {
      return Promise.resolve({
        status: 'failed',
        code: 'unsupported',
        message: 'The speaking-clock engine has been destroyed.',
      });
    }
    return this.spriteSpeechPlayer.prepare(forceRefresh);
  }

  getVoicePackState(): ReturnType<SpriteSpeechPlayer['getState']> {
    return this.spriteSpeechPlayer.getState();
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
      const previousInterval = this.settings.intervalMinutes;
      this.settings.intervalMinutes = Math.max(
        1,
        this.settings.intervalMinutes + deltaMinutes
      );
      const intervalChanged = previousInterval !== this.settings.intervalMinutes;
      if (this.state === 'running' && intervalChanged) {
        this.resetIntervalSchedule(now);
        this.handleTick(now);
      } else if (this.state === 'paused' && intervalChanged) {
        this.resetCadenceOnResume = true;
      }
    }
  }

  /**
   * Starts a fresh continuous/focus cadence at the supplied timestamp.
   * For relative timing this means a full interval from now; for clock-sync it
   * means the nearest strictly-future wall-clock boundary.
   */
  private resetIntervalSchedule(timestamp: number): void {
    const now = new Date(timestamp);
    this.nextAnnouncementTime = calculateNextAnnouncementTime(
      now,
      this.settings.intervalMinutes,
      this.settings.clockSync,
      now
    );
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
   * Reconciles a countdown after start, resume or a live cadence change.
   * Positive thresholds at or behind the current countdown point are history;
   * zero deliberately stays unmarked so the terminal message fires once.
   */
  private markPastDepartureMilestones(secondsRemaining: number, reset = false): void {
    if (reset) this.triggeredMilestones.clear();
    for (const milestone of this.getDepartureMilestones()) {
      if (milestone > 0 && milestone * 60 >= secondsRemaining) {
        this.triggeredMilestones.add(milestone);
      }
    }
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
    if (this.destroyed) {
      return;
    }
    if (this.state === 'running') {
      return;
    }

    if (this.state === 'paused') {
      await this.resume();
      return;
    }

    // Resume the shared Web Audio context directly from the Start gesture.
    const lifecycleGeneration = this.lifecycleGeneration;
    const audioReady = await this.spriteSpeechPlayer.resumeFromUserGesture();
    if (!this.isLifecycleCurrent(lifecycleGeneration, 'idle')) return;
    if (this.spriteSpeechPlayer.getState() !== 'ready' || !audioReady) {
      const error = new Error('Offline voice pack is not ready.');
      this.callbacks.onError?.(error);
      return;
    }

    const now = Date.now();
    this.startTime = now;
    this.lastAnnouncedTargetTime = null;
    this.pauseStartTime = null;
    this.totalPausedDuration = 0;
    this.resetCadenceOnResume = false;
    this.focusEndAnnouncementPending = false;

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
      this.markPastDepartureMilestones(initialSecondsRemaining, true);
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
    await this.silentAudioLoop.start(this.spriteSpeechPlayer.getAudioContext());
    if (!this.isLifecycleCurrent(lifecycleGeneration, 'running')) return;
    if (this.settings.keepAwake) {
      await this.wakeLockService.request();
      if (!this.isLifecycleCurrent(lifecycleGeneration, 'running')) return;
    }

    if (!this.isLifecycleCurrent(lifecycleGeneration, 'running')) return;
    this.setupMediaSession();
    this.handleTick(now);
  }

  /**
   * Pauses the engine.
   */
  pause(): void {
    this.lifecycleGeneration += 1;
    this.manualAnnouncementGeneration += 1;
    if (this.state !== 'running') {
      return;
    }

    this.cancelAudioSequence();
    this.focusEndAnnouncementPending = false;
    this.pauseStartTime = Date.now();
    this.setState('paused');
    this.updateMediaSessionState('paused');
  }

  /**
   * Resumes the paused engine.
   */
  async resume(): Promise<void> {
    if (this.destroyed) {
      return;
    }
    if (this.state !== 'paused') {
      return;
    }

    const lifecycleGeneration = this.lifecycleGeneration;
    const audioReady = await this.spriteSpeechPlayer.resumeFromUserGesture();
    if (!this.isLifecycleCurrent(lifecycleGeneration, 'paused')) return;
    if (this.spriteSpeechPlayer.getState() !== 'ready' || !audioReady) {
      this.callbacks.onError?.(new Error('Offline voice pack is not ready.'));
      return;
    }

    const now = Date.now();
    let pausedDuration = 0;
    if (this.pauseStartTime !== null) {
      pausedDuration = now - this.pauseStartTime;
      this.totalPausedDuration += pausedDuration;
      this.pauseStartTime = null;
    }

    if (this.settings.mode === 'departure') {
      const secondsRemaining = Math.max(
        0,
        Math.floor(((this.departureTargetTimestamp ?? now) - now) / 1000)
      );
      this.markPastDepartureMilestones(secondsRemaining, true);
      this.nextAnnouncementTime = this.calculateNextDepartureMilestoneTime(
        now,
        secondsRemaining
      );
      this.resetCadenceOnResume = false;
    } else if (this.resetCadenceOnResume) {
      // A cadence selected while paused starts only when the timer resumes.
      this.resetIntervalSchedule(now);
      this.resetCadenceOnResume = false;
    } else if (!this.settings.clockSync && this.nextAnnouncementTime) {
      // Preserve the old relative cadence when no interval setting changed.
      this.nextAnnouncementTime = new Date(
        this.nextAnnouncementTime.getTime() + pausedDuration
      );
    }

    this.setState('running');

    await this.silentAudioLoop.start(this.spriteSpeechPlayer.getAudioContext());
    if (!this.isLifecycleCurrent(lifecycleGeneration, 'running')) return;
    if (this.settings.keepAwake) {
      await this.wakeLockService.request();
      if (!this.isLifecycleCurrent(lifecycleGeneration, 'running')) return;
    }

    if (!this.isLifecycleCurrent(lifecycleGeneration, 'running')) return;
    this.updateMediaSessionState('playing');
    this.handleTick(now);
  }

  /**
   * Stops the engine and resets session state.
   */
  stop(): void {
    this.lifecycleGeneration += 1;
    this.manualAnnouncementGeneration += 1;
    // Invalidate audio even while idle: a manual voice test can still be
    // awaiting its chime when the component is unmounted.
    this.cancelAudioSequence();

    if (this.state !== 'idle') this.setState('idle');
    this.stopTimerLoop();

    this.wakeLockService.release().catch(() => {});
    this.silentAudioLoop.stop();

    this.updateMediaSessionState('none');

    this.startTime = null;
    this.lastAnnouncedTargetTime = null;
    this.pauseStartTime = null;
    this.totalPausedDuration = 0;
    this.nextAnnouncementTime = null;
    this.resetCadenceOnResume = false;
    this.focusEndAnnouncementPending = false;
    this.departureTargetTimestamp = null;
    this.departureInitialSeconds = null;
    this.triggeredMilestones.clear();
  }

  /**
   * Permanently stops and cleans up engine resources.
   */
  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.spriteSpeechPlayer.release();
    this.clearMediaSession();
  }

  /**
   * Updates partial settings dynamically.
   */
  updateSettings(settings: Partial<SpeakingClockSettings>): void {
    const prevWakeLock = this.settings.keepAwake;
    const prevMode = this.settings.mode;
    const prevTarget = this.settings.departure?.targetTime;
    const prevDepartureCadence = {
      smartDensity: this.settings.departure.smartDensity,
      intervalMinutes: this.settings.departure.intervalMinutes,
      customMilestonesMinutes: this.settings.departure.customMilestonesMinutes,
    };
    const prevInterval = this.settings.intervalMinutes;
    const prevClockSync = this.settings.clockSync;

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

    const modeChanged = prevMode !== this.settings.mode;
    if (modeChanged) {
      this.focusEndAnnouncementPending = false;
    }
    const cadenceChanged =
      prevInterval !== this.settings.intervalMinutes ||
      prevClockSync !== this.settings.clockSync;
    const departureCadenceChanged =
      prevDepartureCadence.smartDensity !== this.settings.departure.smartDensity ||
      prevDepartureCadence.intervalMinutes !== this.settings.departure.intervalMinutes ||
      JSON.stringify(prevDepartureCadence.customMilestonesMinutes ?? []) !==
        JSON.stringify(this.settings.departure.customMilestonesMinutes ?? []);

    if (
      this.settings.mode === 'departure' &&
      (modeChanged || prevTarget !== this.settings.departure.targetTime)
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
        this.markPastDepartureMilestones(remaining, true);
      }
    }

    if (this.state === 'running') {
      const now = Date.now();
      if (this.settings.mode === 'departure') {
        this.resetCadenceOnResume = false;
        const secondsRemaining = Math.max(
          0,
          Math.floor(((this.departureTargetTimestamp ?? now) - now) / 1000)
        );
        if (departureCadenceChanged) {
          // A live cadence change starts from the next still-future milestone.
          // Mark every new milestone at or behind the current countdown point
          // so switching modes cannot replay a boundary already passed.
          this.markPastDepartureMilestones(secondsRemaining, true);
        }
        this.nextAnnouncementTime = this.calculateNextDepartureMilestoneTime(
          now,
          secondsRemaining
        );
      } else if (cadenceChanged || modeChanged) {
        this.resetIntervalSchedule(now);
        this.resetCadenceOnResume = false;
        this.handleTick(now);
      }

      if (this.settings.keepAwake && !prevWakeLock) {
        this.wakeLockService.request().catch(() => {});
      } else if (!this.settings.keepAwake && prevWakeLock) {
        this.wakeLockService.release().catch(() => {});
      }

      this.updateMediaSessionMetadata();
    } else if (this.state === 'paused') {
      if (this.settings.mode === 'departure') {
        this.resetCadenceOnResume = false;
      } else if (cadenceChanged || modeChanged) {
        this.resetCadenceOnResume = true;
      }

      if (this.settings.keepAwake && !prevWakeLock) {
        this.wakeLockService.request().catch(() => {});
      } else if (!this.settings.keepAwake && prevWakeLock) {
        this.wakeLockService.release().catch(() => {});
      }
    }
  }

  /**
   * Manually triggers an immediate voice time announcement.
   */
  async triggerImmediateAnnouncement(): Promise<void> {
    if (this.destroyed) return;
    const lifecycleGeneration = this.lifecycleGeneration;
    const manualGeneration = ++this.manualAnnouncementGeneration;
    const audioReady = await this.spriteSpeechPlayer.resumeFromUserGesture();
    if (
      !this.isLifecycleCurrent(lifecycleGeneration) ||
      manualGeneration !== this.manualAnnouncementGeneration
    ) return;
    if (this.spriteSpeechPlayer.getState() !== 'ready' || !audioReady) {
      this.callbacks.onError?.(new Error('Offline voice pack is not ready.'));
      return;
    }

    const now = new Date();
    const elapsedMs = this.startTime
      ? Date.now() - this.startTime - this.totalPausedDuration
      : 0;
    const elapsedMinutes = Math.floor(Math.max(0, elapsedMs) / 60000);

    const plan = planTimeAnnouncement(now, this.settings.formatStyle, {
      elapsedMinutes,
      isSessionEnd: false,
    });

    const payload: AnnouncementPayload = {
      text: plan.text,
      timestamp: now,
      elapsedMinutes,
      isFocusEnd: false,
      reason: 'manual',
    };

    this.callbacks.onAnnounce?.(payload);
    await this.executeAudioSequence(plan);
  }

  private isLifecycleCurrent(
    generation: number,
    expectedState?: ClockState
  ): boolean {
    return (
      !this.destroyed &&
      generation === this.lifecycleGeneration &&
      (expectedState === undefined || this.state === expectedState)
    );
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
    this.reapAudioSequenceIfElapsed();
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

      const departureSecondsRemaining = Math.max(
        0,
        Math.floor((this.departureTargetTimestamp - timestamp) / 1000)
      );
      secondsRemaining = departureSecondsRemaining;
      totalSeconds = this.departureInitialSeconds ?? Math.max(1, departureSecondsRemaining);
      const elapsedInDeparture = Math.max(0, totalSeconds - departureSecondsRemaining);
      progressPercent = Math.min(100, Math.max(0, (elapsedInDeparture / totalSeconds) * 100));

      const targetDate = new Date(this.departureTargetTimestamp);
      const milestones = this.getDepartureMilestones();

      if (this.state === 'running' && !this.isAnnouncing) {
        const reachedMilestones = milestones.filter(
          (milestone) =>
            departureSecondsRemaining <= milestone * 60 &&
            !this.triggeredMilestones.has(milestone)
        );
        const shouldFinish = departureSecondsRemaining <= 0 && reachedMilestones.includes(0);
        for (const milestone of reachedMilestones) {
          this.triggeredMilestones.add(milestone);
        }

        if (shouldFinish) {
          const plan = planDepartureAnnouncement(
            0,
            this.settings.departure.label,
            targetDate,
            true
          );
          const payload: AnnouncementPayload = {
            text: plan.text,
            timestamp: now,
            elapsedMinutes,
            isFocusEnd: false,
            reason: 'session_end',
          };
          this.callbacks.onAnnounce?.(payload);
          const lifecycleGeneration = this.lifecycleGeneration;
          this.executeAudioSequence(plan).then(() => {
            if (this.isLifecycleCurrent(lifecycleGeneration, 'running')) {
              this.stop();
            }
          });
        } else if (reachedMilestones.some((milestone) => milestone > 0)) {
          // A throttled background tick can cross several thresholds. Mark
          // every missed one above, but speak the current remaining time once.
          const plan = planDepartureAnnouncement(
            departureSecondsRemaining,
            this.settings.departure.label,
            targetDate,
            false
          );
          const payload: AnnouncementPayload = {
            text: plan.text,
            timestamp: now,
            elapsedMinutes,
            isFocusEnd: false,
            reason: 'interval',
          };
          this.callbacks.onAnnounce?.(payload);
          this.executeAudioSequence(plan);
        }
      }

      this.nextAnnouncementTime = this.calculateNextDepartureMilestoneTime(
        timestamp,
        departureSecondsRemaining
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
        if (isFocusEnd && !this.focusEndAnnouncementPending) {
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
    const plan = planTimeAnnouncement(now, this.settings.formatStyle, {
      elapsedMinutes,
      isSessionEnd: false,
    });

    const payload: AnnouncementPayload = {
      text: plan.text,
      timestamp: now,
      elapsedMinutes,
      isFocusEnd: false,
      reason: 'interval',
    };

    this.callbacks.onAnnounce?.(payload);
    this.executeAudioSequence(plan);
  }

  /**
   * Triggers focus session completion announcement and stops engine.
   */
  private triggerFocusEndAnnouncement(now: Date, elapsedMinutes: number): void {
    if (this.focusEndAnnouncementPending) return;
    this.focusEndAnnouncementPending = true;

    const plan = planTimeAnnouncement(now, 'elapsed', {
      elapsedMinutes,
      isSessionEnd: true,
    });

    const payload: AnnouncementPayload = {
      text: plan.text,
      timestamp: now,
      elapsedMinutes,
      isFocusEnd: true,
      reason: 'session_end',
    };

    this.callbacks.onAnnounce?.(payload);
    const lifecycleGeneration = this.lifecycleGeneration;
    this.executeAudioSequence(plan).then(() => {
      if (this.isLifecycleCurrent(lifecycleGeneration, 'running')) {
        this.stop();
      }
    });
  }

  /**
   * Schedules the chime and every prerecorded fragment in one synchronous Web
   * Audio operation. There is no fetch, decode, timer or await between them.
   */
  private async executeAudioSequence(plan: AnnouncementPlan): Promise<boolean> {
    this.cancelAudioSequence();
    const sequenceGeneration = ++this.audioSequenceGeneration;
    this.isAnnouncing = true;

    try {
      const context = this.spriteSpeechPlayer.getAudioContext();
      if (!context || this.spriteSpeechPlayer.getState() !== 'ready') {
        throw new Error('Offline voice pack is not ready.');
      }
      const startAt = context.currentTime + 0.05;
      this.scheduledChime = this.settings.chimeEnabled
        ? scheduleChime(context, startAt, {
            volume: this.settings.chimeVolume,
            tone: this.settings.chimeTone,
          })
        : null;
      const voiceStartAt = (this.scheduledChime?.endAt ?? startAt) + 0.08;
      const voiceSequence = this.spriteSpeechPlayer.schedule(
        plan,
        voiceStartAt,
        this.settings.volume
      );
      this.scheduledVoice = voiceSequence;

      const status = await voiceSequence.done;
      if (sequenceGeneration !== this.audioSequenceGeneration) return false;
      const outcome: SpeechOutcome = {
        status: status === 'completed' ? 'completed' : 'cancelled',
        attempts: 1,
        visibilityState:
          typeof document === 'undefined' ? 'unknown' : document.visibilityState,
      };
      this.callbacks.onSpeechOutcome?.(outcome);
      return status === 'completed';
    } catch (error) {
      if (sequenceGeneration === this.audioSequenceGeneration) {
        this.scheduledVoice?.stop();
        this.scheduledChime?.stop();
        this.spriteSpeechPlayer.cancel(this.scheduledVoice ?? undefined);
        // Avoid a second stop from the shared finally block. Real scheduled
        // chimes are idempotent, but single ownership keeps mocks and custom
        // implementations honest too.
        this.scheduledChime = null;
        const outcome: SpeechOutcome = {
          status: 'failed',
          attempts: 1,
          errorCode: error instanceof Error ? error.message : 'voice-playback-failed',
          visibilityState:
            typeof document === 'undefined' ? 'unknown' : document.visibilityState,
        };
        this.callbacks.onSpeechOutcome?.(outcome);
        this.callbacks.onError?.(error as Error);
      }
      return false;
    } finally {
      if (sequenceGeneration === this.audioSequenceGeneration) {
        // Android may omit an oscillator `onended` event while backgrounded.
        // Voice completion is an independent audio-clock proof that the earlier
        // gong has elapsed, so disconnect its graph explicitly and idempotently.
        this.scheduledChime?.stop();
        this.scheduledVoice = null;
        this.scheduledChime = null;
        this.isAnnouncing = false;
      }
    }
  }

  private reapAudioSequenceIfElapsed(): void {
    if (!this.isAnnouncing || !this.scheduledVoice) return;
    if (this.scheduledVoice.reap()) {
      this.scheduledChime?.stop();
      this.scheduledVoice = null;
      this.scheduledChime = null;
      this.isAnnouncing = false;
    }
  }

  private cancelAudioSequence(): void {
    this.audioSequenceGeneration += 1;
    this.isAnnouncing = false;
    this.scheduledVoice?.stop();
    this.scheduledChime?.stop();
    this.spriteSpeechPlayer.cancel();
    this.scheduledVoice = null;
    this.scheduledChime = null;
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
