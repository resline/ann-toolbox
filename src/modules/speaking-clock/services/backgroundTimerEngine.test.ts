import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BackgroundTimerEngine,
  calculateNextAnnouncementTime,
} from './backgroundTimerEngine';
import {
  DEFAULT_SPEAKING_CLOCK_SETTINGS,
  type TickPayload,
  type AnnouncementPayload,
  type ClockState,
} from '../types';
import * as chimeSynthesizer from '../../../lib/audio/chime';
import { WakeLockService } from './wakeLockService';
import { SilentAudioLoop } from './silentAudioLoop';
import { SpriteSpeechPlayer } from './spriteSpeechPlayer';

const voicePlayerMocks = vi.hoisted(() => {
  const context = { currentTime: 10, state: 'running', destination: {} } as AudioContext;
  const defaultSequence = () => ({
    startAt: 10,
    endAt: 11,
    sources: [],
    done: Promise.resolve<'completed' | 'cancelled'>('completed'),
    reap: vi.fn(() => false),
    stop: vi.fn(),
  });
  return {
    context,
    state: 'ready' as 'idle' | 'loading' | 'ready' | 'failed',
    prepare: vi.fn().mockResolvedValue({ status: 'ready', decodedBytes: 1024, fragmentCount: 337 }),
    resumeFromUserGesture: vi.fn().mockResolvedValue(true),
    schedule: vi.fn(defaultSequence),
    defaultSequence,
    cancel: vi.fn(),
    release: vi.fn(),
  };
});

// Mock dependencies
vi.mock('../../../lib/audio/chime', () => ({
  playChime: vi.fn().mockResolvedValue(undefined),
  scheduleChime: vi.fn((_context, startAt) => ({
    startAt,
    endAt: startAt + 0.81,
    stop: vi.fn(),
  })),
  closeAudioContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./spriteSpeechPlayer', () => ({
  SpriteSpeechPlayer: vi.fn().mockImplementation(() => ({
    prepare: voicePlayerMocks.prepare,
    getState: () => voicePlayerMocks.state,
    getAudioContext: () => voicePlayerMocks.context,
    resumeFromUserGesture: voicePlayerMocks.resumeFromUserGesture,
    schedule: voicePlayerMocks.schedule,
    cancel: voicePlayerMocks.cancel,
    release: voicePlayerMocks.release,
  })),
}));

describe('BackgroundTimerEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (voicePlayerMocks.context as AudioContext & { currentTime: number }).currentTime = 10;
    voicePlayerMocks.state = 'ready';
    voicePlayerMocks.prepare.mockResolvedValue({ status: 'ready', decodedBytes: 1024, fragmentCount: 337 });
    voicePlayerMocks.resumeFromUserGesture.mockResolvedValue(true);
    voicePlayerMocks.schedule.mockImplementation(voicePlayerMocks.defaultSequence);
    vi.mocked(SpriteSpeechPlayer).mockImplementation(() => ({
      prepare: voicePlayerMocks.prepare,
      getState: () => voicePlayerMocks.state,
      getAudioContext: () => voicePlayerMocks.context,
      resumeFromUserGesture: voicePlayerMocks.resumeFromUserGesture,
      schedule: voicePlayerMocks.schedule,
      cancel: voicePlayerMocks.cancel,
      release: voicePlayerMocks.release,
    } as unknown as SpriteSpeechPlayer));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('reports interruption and pauses when the browser suspends audio', async () => {
    const events = new EventTarget();
    const add = vi.fn(events.addEventListener.bind(events));
    const remove = vi.fn(events.removeEventListener.bind(events));
    Object.assign(voicePlayerMocks.context, { addEventListener: add, removeEventListener: remove });
    const onError = vi.fn();
    const onSpeechOutcome = vi.fn();
    const engine = new BackgroundTimerEngine({ keepAwake: false }, { onError, onSpeechOutcome });
    try {
      await engine.start();
      Object.defineProperty(voicePlayerMocks.context, 'state', { value: 'suspended', configurable: true, writable: true });
      events.dispatchEvent(new Event('statechange'));
      expect(engine.getState()).toBe('paused');
      expect(onError).toHaveBeenCalledWith(new Error('audio-suspended'));
      expect(onSpeechOutcome).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', errorCode: 'audio-suspended' }));
    } finally {
      engine.destroy();
      Object.assign(voicePlayerMocks.context, { state: 'running' });
      expect(remove).toHaveBeenCalledWith('statechange', expect.any(Function));
      delete (voicePlayerMocks.context as Partial<AudioContext>).addEventListener;
      delete (voicePlayerMocks.context as Partial<AudioContext>).removeEventListener;
    }
  });

  describe('calculateNextAnnouncementTime helper', () => {
    it('calculates wall-clock aligned next target (:15 min interval from 10:07:23 -> 10:15:00)', () => {
      const now = new Date(2026, 7, 27, 10, 7, 23);
      const target = calculateNextAnnouncementTime(now, 15, true);

      expect(target.getFullYear()).toBe(2026);
      expect(target.getMonth()).toBe(7);
      expect(target.getDate()).toBe(27);
      expect(target.getHours()).toBe(10);
      expect(target.getMinutes()).toBe(15);
      expect(target.getSeconds()).toBe(0);
      expect(target.getMilliseconds()).toBe(0);
    });

    it('calculates wall-clock aligned target with hour rollover (:15 min interval from 10:55:00 -> 11:00:00)', () => {
      const now = new Date(2026, 7, 27, 10, 55, 0);
      const target = calculateNextAnnouncementTime(now, 15, true);

      expect(target.getHours()).toBe(11);
      expect(target.getMinutes()).toBe(0);
      expect(target.getSeconds()).toBe(0);
    });

    it('calculates wall-clock aligned target with day rollover (:15 min interval from 23:50:00 -> 00:00:00 next day)', () => {
      const now = new Date(2026, 7, 27, 23, 50, 0);
      const target = calculateNextAnnouncementTime(now, 15, true);

      expect(target.getDate()).toBe(28);
      expect(target.getHours()).toBe(0);
      expect(target.getMinutes()).toBe(0);
    });

    it('calculates relative next target when clockSync is false (from start/base time + interval)', () => {
      const baseTime = new Date(2026, 7, 27, 10, 7, 23);
      const target = calculateNextAnnouncementTime(baseTime, 10, false, baseTime);

      expect(target.getTime()).toBe(baseTime.getTime() + 10 * 60 * 1000);
      expect(target.getHours()).toBe(10);
      expect(target.getMinutes()).toBe(17);
      expect(target.getSeconds()).toBe(23);
    });

    it('handles 60 minute interval correctly', () => {
      const now = new Date(2026, 7, 27, 14, 20, 0);
      const target = calculateNextAnnouncementTime(now, 60, true);

      expect(target.getHours()).toBe(15);
      expect(target.getMinutes()).toBe(0);
    });

    it('handles 1 minute interval correctly', () => {
      const now = new Date(2026, 7, 27, 10, 0, 30);
      const target = calculateNextAnnouncementTime(now, 1, true);

      expect(target.getMinutes()).toBe(1);
      expect(target.getSeconds()).toBe(0);
    });
  });

  describe('Engine Lifecycle & State Transitions', () => {
    it('initializes with default settings and idle state', () => {
      const engine = new BackgroundTimerEngine();
      expect(engine.getState()).toBe('idle');
      expect(engine.getSettings()).toEqual(DEFAULT_SPEAKING_CLOCK_SETTINGS);
    });

    it('transitions state: idle -> running -> paused -> running -> idle', async () => {
      const onStateChange = vi.fn();
      const engine = new BackgroundTimerEngine({}, { onStateChange });

      // Start
      await engine.start();
      expect(engine.getState()).toBe('running');
      expect(onStateChange).toHaveBeenCalledWith('running');

      // Pause
      engine.pause();
      expect(engine.getState()).toBe('paused');
      expect(onStateChange).toHaveBeenCalledWith('paused');

      // Resume
      await engine.resume();
      expect(engine.getState()).toBe('running');
      expect(onStateChange).toHaveBeenCalledWith('running');

      // Stop
      engine.stop();
      expect(engine.getState()).toBe('idle');
      expect(onStateChange).toHaveBeenCalledWith('idle');
    });

    it('ignores start when already running and pause when idle', async () => {
      const onStateChange = vi.fn();
      const engine = new BackgroundTimerEngine({}, { onStateChange });

      engine.pause();
      expect(engine.getState()).toBe('idle');
      expect(onStateChange).not.toHaveBeenCalled();

      await engine.start();
      expect(onStateChange).toHaveBeenCalledTimes(1);

      await engine.start(); // redundant start
      expect(onStateChange).toHaveBeenCalledTimes(1);

      engine.stop();
    });

    it('cleans up resources on destroy()', async () => {
      const engine = new BackgroundTimerEngine();
      await engine.start();
      engine.destroy();
      expect(engine.getState()).toBe('idle');
    });

    it('does not resurrect a stopped engine after a delayed AudioContext resume', async () => {
      let finishResume!: (ready: boolean) => void;
      voicePlayerMocks.resumeFromUserGesture.mockReturnValueOnce(
        new Promise<boolean>((resolve) => { finishResume = resolve; })
      );
      const silentStart = vi.spyOn(SilentAudioLoop.prototype, 'start');
      const engine = new BackgroundTimerEngine();

      const startPromise = engine.start();
      await Promise.resolve();
      engine.stop();
      finishResume(true);
      await startPromise;

      expect(engine.getState()).toBe('idle');
      expect(silentStart).not.toHaveBeenCalled();
    });

    it('does not announce after destroy wins a delayed manual resume', async () => {
      let finishResume!: (ready: boolean) => void;
      voicePlayerMocks.resumeFromUserGesture.mockReturnValueOnce(
        new Promise<boolean>((resolve) => { finishResume = resolve; })
      );
      const onAnnounce = vi.fn();
      const engine = new BackgroundTimerEngine({}, { onAnnounce });

      const announcement = engine.triggerImmediateAnnouncement();
      await Promise.resolve();
      engine.destroy();
      finishResume(true);
      await announcement;

      expect(onAnnounce).not.toHaveBeenCalled();
      expect(voicePlayerMocks.schedule).not.toHaveBeenCalled();
    });
  });

  describe('Ticks & Interval Announcement Coordination', () => {
    it('emits onTick callbacks with elapsed time and remaining seconds to next announcement', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 0, 0);
      vi.setSystemTime(baseDate);

      const ticks: TickPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { intervalMinutes: 15, clockSync: true },
        { onTick: (p) => ticks.push(p) }
      );

      await engine.start();

      // Advance 10 seconds
      vi.advanceTimersByTime(10000);

      expect(ticks.length).toBeGreaterThan(0);
      const lastTick = ticks[ticks.length - 1];
      expect(lastTick.state).toBe('running');
      expect(lastTick.elapsedSeconds).toBe(10);
      // Next announcement at 10:15:00 -> 15 * 60 - 10 = 890 seconds remaining
      expect(lastTick.remainingSecondsToNextAnnouncement).toBe(890);

      engine.stop();
    });

    it('triggers announcement when reaching target wall-clock minute', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 14, 55); // 5s before 10:15:00
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        {
          intervalMinutes: 15,
          clockSync: true,
          formatStyle: 'natural',
          chimeEnabled: true,
        },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.start();

      // Advance by 6 seconds (crossing 10:15:00)
      await vi.advanceTimersByTimeAsync(6000);

      expect(announcements.length).toBe(1);
      expect(announcements[0].reason).toBe('interval');
      expect(announcements[0].text).toContain('Piętnaście po dziesiątej');
      expect(chimeSynthesizer.scheduleChime).toHaveBeenCalledTimes(1);
      expect(voicePlayerMocks.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('Piętnaście po dziesiątej') }),
        expect.any(Number),
        expect.any(Number)
      );

      engine.stop();
    });

    it('does not play chime when chimeEnabled is false', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 14, 58);
      vi.setSystemTime(baseDate);

      const engine = new BackgroundTimerEngine({
        intervalMinutes: 15,
        clockSync: true,
        chimeEnabled: false,
      });

      await engine.start();
      await vi.advanceTimersByTimeAsync(3000);

      expect(chimeSynthesizer.scheduleChime).not.toHaveBeenCalled();
      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(1);

      engine.stop();
    });

    it('does not duplicate announcements in the same second/interval', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 14, 59);
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { intervalMinutes: 15, clockSync: true },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.start();

      // Tick multiple times around 10:15:00
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);

      expect(announcements.length).toBe(1);

      engine.stop();
    });

    it('applies keep-awake changes while paused', async () => {
      const request = vi.spyOn(WakeLockService.prototype, 'request').mockResolvedValue(true);
      const release = vi.spyOn(WakeLockService.prototype, 'release').mockResolvedValue(undefined);
      const engine = new BackgroundTimerEngine({ keepAwake: true });
      await engine.start();
      engine.pause();
      request.mockClear();
      release.mockClear();

      engine.updateSettings({ keepAwake: false });
      expect(release).toHaveBeenCalledTimes(1);
      engine.updateSettings({ keepAwake: true });
      expect(request).toHaveBeenCalledTimes(1);

      engine.stop();
    });
  });

  describe('Relative Interval Timing (clockSync: false)', () => {
    it('announces relative to session start time', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 7, 23);
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { intervalMinutes: 5, clockSync: false },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.start();

      // 4m 50s later -> no announcement
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000 + 50 * 1000);
      expect(announcements.length).toBe(0);

      // 15s later (total 5m 5s) -> 1 announcement triggered
      await vi.advanceTimersByTimeAsync(15000);
      expect(announcements.length).toBe(1);
      expect(announcements[0].reason).toBe('interval');

      engine.stop();
    });

    it('accounts for paused duration in relative mode', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 0, 0);
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { intervalMinutes: 5, clockSync: false },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.start();

      // Run for 2 minutes
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

      // Pause for 3 minutes
      engine.pause();
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);

      // Resume: total elapsed active time should still be 2 minutes, remaining 3 minutes
      await engine.resume();

      // Advance 2 more minutes active (total 4 min active) -> no announcement yet
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(announcements.length).toBe(0);

      // Advance 1 more minute active (total 5 min active) -> triggers announcement
      await vi.advanceTimersByTimeAsync(1 * 60 * 1000 + 500);
      expect(announcements.length).toBe(1);

      engine.stop();
    });
  });

  describe('Immediate Announcement (triggerImmediateAnnouncement)', () => {
    it('manually triggers announcement immediately with current time and chime', async () => {
      const baseDate = new Date(2026, 7, 27, 12, 0, 0);
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { formatStyle: 'natural', chimeEnabled: true },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.triggerImmediateAnnouncement();

      expect(announcements.length).toBe(1);
      expect(announcements[0].reason).toBe('manual');
      expect(announcements[0].text).toContain('Dwunasta w południe');
      expect(chimeSynthesizer.scheduleChime).toHaveBeenCalledTimes(1);
      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(1);
      expect(voicePlayerMocks.resumeFromUserGesture).toHaveBeenCalledTimes(1);
    });

    it('schedules speech in the same turn as the chime and cancels both on stop', async () => {
      let finishVoice!: (status: 'completed' | 'cancelled') => void;
      const stopVoice = vi.fn();
      voicePlayerMocks.schedule.mockReturnValueOnce({
        startAt: 10.94,
        endAt: 12,
        sources: [],
        done: new Promise<'completed' | 'cancelled'>((resolve) => { finishVoice = resolve; }),
        reap: vi.fn(() => false),
        stop: stopVoice,
      });
      const engine = new BackgroundTimerEngine({ chimeEnabled: true });

      const announcementPromise = engine.triggerImmediateAnnouncement();
      await Promise.resolve();
      expect(chimeSynthesizer.scheduleChime).toHaveBeenCalledTimes(1);
      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(1);

      engine.stop();
      finishVoice('cancelled');
      await announcementPromise;

      expect(stopVoice).toHaveBeenCalledTimes(1);
      expect(voicePlayerMocks.cancel).toHaveBeenCalled();
    });

    it('ignores the stale outcome when a newer manual test replaces an active one', async () => {
      let finishFirstSpeech!: (status: 'completed' | 'cancelled') => void;
      const stopFirst = vi.fn();
      voicePlayerMocks.schedule
        .mockReturnValueOnce({
          startAt: 10,
          endAt: 11,
          sources: [],
          done: new Promise<'completed' | 'cancelled'>((resolve) => { finishFirstSpeech = resolve; }),
          reap: vi.fn(() => false),
          stop: stopFirst,
        })
        .mockImplementationOnce(voicePlayerMocks.defaultSequence);
      const onSpeechOutcome = vi.fn();
      const engine = new BackgroundTimerEngine(
        { chimeEnabled: false },
        { onSpeechOutcome }
      );

      const first = engine.triggerImmediateAnnouncement();
      await Promise.resolve();
      const second = engine.triggerImmediateAnnouncement();
      await second;
      finishFirstSpeech('completed');
      await first;

      expect(stopFirst).toHaveBeenCalledTimes(1);
      expect(onSpeechOutcome).toHaveBeenCalledTimes(1);
    });

    it('does not let an older delayed manual resume replace a newer test', async () => {
      let finishFirstResume!: (ready: boolean) => void;
      let finishSecondResume!: (ready: boolean) => void;
      voicePlayerMocks.resumeFromUserGesture
        .mockReturnValueOnce(new Promise<boolean>((resolve) => { finishFirstResume = resolve; }))
        .mockReturnValueOnce(new Promise<boolean>((resolve) => { finishSecondResume = resolve; }));
      const onAnnounce = vi.fn();
      const engine = new BackgroundTimerEngine({}, { onAnnounce });

      const first = engine.triggerImmediateAnnouncement();
      const second = engine.triggerImmediateAnnouncement();
      finishSecondResume(true);
      await second;
      finishFirstResume(true);
      await first;

      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(1);
      expect(onAnnounce).toHaveBeenCalledTimes(1);
    });

    it('reaps a background sequence from audio time so the next interval can announce', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0));
      let finishFirst!: (status: 'completed' | 'cancelled') => void;
      const firstDone = new Promise<'completed' | 'cancelled'>((resolve) => { finishFirst = resolve; });
      const stopChime = vi.fn();
      vi.mocked(chimeSynthesizer.scheduleChime).mockReturnValueOnce({
        startAt: 10,
        endAt: 10.81,
        stop: stopChime,
      });
      const reap = vi.fn(() => {
        if (voicePlayerMocks.context.currentTime < 12) return false;
        finishFirst('completed');
        return true;
      });
      voicePlayerMocks.schedule
        .mockReturnValueOnce({
          startAt: 10,
          endAt: 11,
          sources: [],
          done: firstDone,
          reap,
          stop: vi.fn(),
        })
        .mockImplementation(voicePlayerMocks.defaultSequence);
      const engine = new BackgroundTimerEngine({ intervalMinutes: 1, clockSync: false });

      await engine.start();
      await vi.advanceTimersByTimeAsync(60_500);
      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(1);
      (voicePlayerMocks.context as AudioContext & { currentTime: number }).currentTime = 12;
      await vi.advanceTimersByTimeAsync(60_000);

      expect(reap).toHaveBeenCalled();
      expect(stopChime).toHaveBeenCalledTimes(1);
      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(2);
      engine.stop();
    });
  });

  describe('Focus Mode (Pomodoro session limit)', () => {
    it('tracks focusRemainingSeconds and finishes session after focusDurationMinutes', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 0, 0);
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const states: ClockState[] = [];
      const ticks: TickPayload[] = [];

      const engine = new BackgroundTimerEngine(
        {
          mode: 'focus',
          focusDurationMinutes: 25,
          intervalMinutes: 10,
          clockSync: false,
        },
        {
          onAnnounce: (a) => announcements.push(a),
          onStateChange: (s) => states.push(s),
          onTick: (t) => ticks.push(t),
        }
      );

      await engine.start();

      // Tick at start
      vi.advanceTimersByTime(1000);
      const firstTick = ticks[ticks.length - 1];
      expect(firstTick.focusRemainingSeconds).toBe(25 * 60 - 1);

      // Advance 10 minutes -> 1st interval announcement
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      expect(announcements.length).toBe(1);
      expect(announcements[0].isFocusEnd).toBeFalsy();

      // Advance another 10 minutes -> 2nd interval announcement (20 min elapsed)
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      expect(announcements.length).toBe(2);

      // Advance 5 more minutes (25 min total) -> Final focus session end announcement
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 500);

      expect(announcements.length).toBe(3);
      const lastAnnouncement = announcements[2];
      expect(lastAnnouncement.isFocusEnd).toBe(true);
      expect(lastAnnouncement.reason).toBe('session_end');
      expect(lastAnnouncement.text).toContain('Czas sesji minął');

      // Engine automatically stops
      expect(engine.getState()).toBe('idle');
    });

    it('does not let a stale focus completion stop a newly started session', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0));
      let finishOld!: (status: 'completed' | 'cancelled') => void;
      voicePlayerMocks.schedule.mockReturnValueOnce({
        startAt: 10,
        endAt: 11,
        sources: [],
        done: new Promise<'completed' | 'cancelled'>((resolve) => { finishOld = resolve; }),
        reap: vi.fn(() => false),
        stop: vi.fn(),
      });
      const engine = new BackgroundTimerEngine({
        mode: 'focus',
        focusDurationMinutes: 1,
        intervalMinutes: 5,
        clockSync: false,
      });

      await engine.start();
      await vi.advanceTimersByTimeAsync(60_250);
      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(1);
      engine.stop();
      await engine.start();
      finishOld('completed');
      await Promise.resolve();

      expect(engine.getState()).toBe('running');
      engine.stop();
    });

    it('does not schedule a second focus finale when the audio-clock reaper wins the tick', async () => {
      const baseTime = new Date(2026, 7, 27, 10, 0, 0).getTime();
      vi.setSystemTime(baseTime);
      let finishFinal!: (status: 'completed' | 'cancelled') => void;
      const done = new Promise<'completed' | 'cancelled'>((resolve) => {
        finishFinal = resolve;
      });
      const reap = vi.fn(() => {
        finishFinal('completed');
        return true;
      });
      voicePlayerMocks.schedule.mockReturnValueOnce({
        startAt: 10,
        endAt: 11,
        sources: [],
        done,
        reap,
        stop: vi.fn(),
      });
      const onAnnounce = vi.fn();
      const engine = new BackgroundTimerEngine(
        { mode: 'focus', focusDurationMinutes: 1, intervalMinutes: 5, clockSync: false },
        { onAnnounce }
      );

      await engine.start();
      const tick = (engine as unknown as { handleTick(timestamp: number): void }).handleTick.bind(engine);
      tick(baseTime + 60_000);
      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(1);

      (voicePlayerMocks.context as AudioContext & { currentTime: number }).currentTime = 12;
      tick(baseTime + 60_250);

      expect(reap).toHaveBeenCalledTimes(1);
      expect(voicePlayerMocks.schedule).toHaveBeenCalledTimes(1);
      expect(onAnnounce).toHaveBeenCalledTimes(1);
      await Promise.resolve();
      await Promise.resolve();
      expect(engine.getState()).toBe('idle');
    });

    it('stops a finished focus session exactly once when audio scheduling fails', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0));
      voicePlayerMocks.schedule.mockImplementationOnce(() => {
        throw new Error('focus-final-audio-failed');
      });
      const onAnnounce = vi.fn();
      const onError = vi.fn();
      const engine = new BackgroundTimerEngine(
        { mode: 'focus', focusDurationMinutes: 1, intervalMinutes: 5, clockSync: false },
        { onAnnounce, onError }
      );

      await engine.start();
      await vi.advanceTimersByTimeAsync(60_500);
      await vi.advanceTimersByTimeAsync(1_000);

      expect(engine.getState()).toBe('idle');
      expect(onAnnounce).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Settings Updates (updateSettings)', () => {
    it('dynamically updates settings and recalculates target', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 7, 0);
      vi.setSystemTime(baseDate);

      const engine = new BackgroundTimerEngine({
        intervalMinutes: 15,
        clockSync: true,
      });

      await engine.start();

      // Update to 5 min interval
      engine.updateSettings({ intervalMinutes: 5 });
      expect(engine.getSettings().intervalMinutes).toBe(5);

      engine.stop();
    });

    it('starts a full new relative interval at the moment of a live change', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0));
      const ticks: TickPayload[] = [];
      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { intervalMinutes: 5, clockSync: false },
        {
          onTick: (tick) => ticks.push(tick),
          onAnnounce: (announcement) => announcements.push(announcement),
        }
      );

      await engine.start();
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

      engine.updateSettings({ intervalMinutes: 10 });
      const afterChange = ticks[ticks.length - 1];
      expect(afterChange.remainingSecondsToNextAnnouncement).toBe(10 * 60);
      expect(afterChange.nextAnnouncementTime?.getTime()).toBe(
        new Date(2026, 7, 27, 10, 12, 0).getTime()
      );
      expect(announcements).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(9 * 60 * 1000 + 59_750);
      expect(announcements).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(250);
      expect(announcements).toHaveLength(1);

      engine.stop();
    });

    it('uses the nearest future wall-clock boundary after a live synced change', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 10, 7, 0));
      const ticks: TickPayload[] = [];
      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { intervalMinutes: 15, clockSync: true },
        {
          onTick: (tick) => ticks.push(tick),
          onAnnounce: (announcement) => announcements.push(announcement),
        }
      );

      await engine.start();
      engine.updateSettings({ intervalMinutes: 5 });

      const afterChange = ticks[ticks.length - 1];
      expect(afterChange.nextAnnouncementTime?.getTime()).toBe(
        new Date(2026, 7, 27, 10, 10, 0).getTime()
      );
      expect(afterChange.remainingSecondsToNextAnnouncement).toBe(3 * 60);
      expect(announcements).toHaveLength(0);

      engine.stop();
    });

    it('does not reschedule when the selected interval or unrelated settings stay unchanged', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0));
      const ticks: TickPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { intervalMinutes: 5, clockSync: false },
        { onTick: (tick) => ticks.push(tick) }
      );

      await engine.start();
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      const targetBefore = ticks[ticks.length - 1].nextAnnouncementTime?.getTime();

      engine.updateSettings({ intervalMinutes: 5 });
      engine.updateSettings({ volume: 0.5 });
      await vi.advanceTimersByTimeAsync(250);

      expect(ticks[ticks.length - 1].nextAnnouncementTime?.getTime()).toBe(targetBefore);
      expect(ticks[ticks.length - 1].remainingSecondsToNextAnnouncement).toBe(180);

      engine.stop();
    });

    it('starts an interval selected while paused from the moment of resume', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0));
      const ticks: TickPayload[] = [];
      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        { intervalMinutes: 5, clockSync: false },
        {
          onTick: (tick) => ticks.push(tick),
          onAnnounce: (announcement) => announcements.push(announcement),
        }
      );

      await engine.start();
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      engine.pause();
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
      engine.updateSettings({ intervalMinutes: 10 });
      await engine.resume();

      const afterResume = ticks[ticks.length - 1];
      expect(afterResume.remainingSecondsToNextAnnouncement).toBe(10 * 60);
      expect(afterResume.nextAnnouncementTime?.getTime()).toBe(
        new Date(2026, 7, 27, 10, 15, 0).getTime()
      );
      expect(announcements).toHaveLength(0);

      engine.stop();
    });
  });

  describe('MediaSession Integration', () => {
    it('registers mediaSession metadata and action handlers when available', async () => {
      const mockMediaSession = {
        metadata: null as any,
        playbackState: 'none',
        setActionHandler: vi.fn(),
      };

      Object.defineProperty(navigator, 'mediaSession', {
        value: mockMediaSession,
        configurable: true,
        writable: true,
      });

      const engine = new BackgroundTimerEngine();
      await engine.start();

      expect(mockMediaSession.metadata).not.toBeNull();
      expect(mockMediaSession.metadata.title).toBe('Głos Czasu - Narzędziownik Ani');
      expect(mockMediaSession.metadata.artist).toBe('Narzędziownik Ani');
      expect(mockMediaSession.playbackState).toBe('playing');
      expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('stop', expect.any(Function));

      engine.pause();
      expect(mockMediaSession.playbackState).toBe('paused');

      engine.stop();
      expect(mockMediaSession.playbackState).toBe('none');
    });
  });

  describe('WakeLock & SilentAudio Integration', () => {
    it('manages WakeLock and SilentAudio on start and stop', async () => {
      const wakeLockRequestSpy = vi.spyOn(WakeLockService.prototype, 'request').mockResolvedValue(true);
      const wakeLockReleaseSpy = vi.spyOn(WakeLockService.prototype, 'release').mockResolvedValue(undefined);
      const silentAudioStartSpy = vi.spyOn(SilentAudioLoop.prototype, 'start').mockResolvedValue(true);
      const silentAudioStopSpy = vi.spyOn(SilentAudioLoop.prototype, 'stop').mockReturnValue(undefined);

      const engine = new BackgroundTimerEngine({
        keepAwake: true,
      });

      await engine.start();
      expect(wakeLockRequestSpy).toHaveBeenCalled();
      expect(silentAudioStartSpy).toHaveBeenCalled();

      engine.stop();
      expect(wakeLockReleaseSpy).toHaveBeenCalled();
      expect(silentAudioStopSpy).toHaveBeenCalled();
    });
  });

  describe('Error handling & Callbacks', () => {
    it('catches audio scheduling errors and reports to onError callback', async () => {
      const error = new Error('Audio Context failure');
      vi.mocked(chimeSynthesizer.scheduleChime).mockImplementationOnce(() => {
        throw error;
      });

      const onError = vi.fn();
      const engine = new BackgroundTimerEngine(
        { chimeEnabled: true },
        { onError }
      );

      await engine.triggerImmediateAnnouncement();

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('reports a sprite scheduling failure without stopping the timer', async () => {
      voicePlayerMocks.schedule.mockImplementationOnce(() => {
        throw new Error('missing-fragment');
      });
      const onSpeechOutcome = vi.fn();
      const onError = vi.fn();
      const engine = new BackgroundTimerEngine(
        { chimeEnabled: false },
        { onSpeechOutcome, onError }
      );

      await engine.start();
      await engine.triggerImmediateAnnouncement();

      expect(onSpeechOutcome).toHaveBeenCalledWith({
        status: 'failed',
        attempts: 1,
        errorCode: 'missing-fragment',
        visibilityState: 'visible',
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(engine.getState()).toBe('running');

      engine.stop();
    });

    it('rolls back a scheduled chime when voice scheduling throws', async () => {
      const stopChime = vi.fn();
      vi.mocked(chimeSynthesizer.scheduleChime).mockReturnValueOnce({
        startAt: 10,
        endAt: 10.8,
        stop: stopChime,
      });
      voicePlayerMocks.schedule.mockImplementationOnce(() => {
        throw new Error('voice-start-failed');
      });
      const engine = new BackgroundTimerEngine({ chimeEnabled: true });

      await engine.triggerImmediateAnnouncement();

      expect(stopChime).toHaveBeenCalledTimes(1);
    });
  });

  describe('Departure Mode & Smart Density Milestones', () => {
    it('initializes departure mode and provides getDepartureTargetTime & setDepartureTarget', () => {
      const engine = new BackgroundTimerEngine({
        mode: 'departure',
        departure: {
          targetTime: '08:30',
          label: 'Wyjście na pociąg',
          smartDensity: true,
        },
      });

      expect(engine.getDepartureTargetTime()).toBe('08:30');

      engine.setDepartureTarget('09:15', 'Spotkanie w biurze');
      expect(engine.getDepartureTargetTime()).toBe('09:15');
      expect(engine.getSettings().departure.label).toBe('Spotkanie w biurze');
    });

    it('shifts target time with addMinutes(+5) and addMinutes(-5) in departure mode', () => {
      const engine = new BackgroundTimerEngine({
        mode: 'departure',
        departure: {
          targetTime: '08:30',
          label: 'Wyjście z domu',
          smartDensity: true,
        },
      });

      expect(engine.getDepartureTargetTime()).toBe('08:30');

      // +5 minutes -> 08:35
      engine.addMinutes(5);
      expect(engine.getDepartureTargetTime()).toBe('08:35');
      expect(engine.getSettings().departure.targetTime).toBe('08:35');

      // -5 minutes -> 08:30
      engine.addMinutes(-5);
      expect(engine.getDepartureTargetTime()).toBe('08:30');
      expect(engine.getSettings().departure.targetTime).toBe('08:30');
    });

    it('handles hour boundary rollover with addMinutes in departure mode', () => {
      const engine = new BackgroundTimerEngine({
        mode: 'departure',
        departure: {
          targetTime: '23:55',
          label: 'Nocny autobus',
          smartDensity: true,
        },
      });

      engine.addMinutes(10);
      expect(engine.getDepartureTargetTime()).toBe('00:05');
    });

    it('adjusts duration in focus mode and interval in continuous mode via addMinutes', () => {
      const focusEngine = new BackgroundTimerEngine({
        mode: 'focus',
        focusDurationMinutes: 25,
      });
      focusEngine.addMinutes(5);
      expect(focusEngine.getSettings().focusDurationMinutes).toBe(30);
      focusEngine.addMinutes(-50);
      expect(focusEngine.getSettings().focusDurationMinutes).toBe(1); // clamped min 1

      const contEngine = new BackgroundTimerEngine({
        mode: 'continuous',
        intervalMinutes: 15,
      });
      contEngine.addMinutes(5);
      expect(contEngine.getSettings().intervalMinutes).toBe(20);
      contEngine.addMinutes(-30);
      expect(contEngine.getSettings().intervalMinutes).toBe(1); // clamped min 1
    });

    it('rolls over target to tomorrow if targetTime today is more than 1 minute in the past', async () => {
      const baseDate = new Date(2026, 7, 27, 20, 0, 0); // 20:00:00 today
      vi.setSystemTime(baseDate);

      const ticks: TickPayload[] = [];
      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '08:30', // this morning 08:30 is > 1 min ago -> set for tomorrow 08:30
            label: 'Poranny start',
            smartDensity: true,
          },
        },
        { onTick: (t) => ticks.push(t) }
      );

      await engine.start();
      const firstTick = ticks[ticks.length - 1];
      // 20:00 today to 08:30 tomorrow = 12h 30m = 45000 seconds
      expect(firstTick.secondsRemaining).toBe(45000);
      expect(firstTick.targetTime).toBe('08:30');
      expect(firstTick.departureLabel).toBe('Poranny start');

      engine.stop();
    });

    it('announces the terminal departure once when started within the target-minute tolerance', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 8, 30, 30));
      const onAnnounce = vi.fn();
      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '08:30',
            label: 'Wyjście z domu',
            smartDensity: true,
          },
        },
        { onAnnounce }
      );

      await engine.start();
      await Promise.resolve();
      await Promise.resolve();

      expect(onAnnounce).toHaveBeenCalledTimes(1);
      expect(onAnnounce.mock.calls[0][0].reason).toBe('session_end');
      expect(engine.getState()).toBe('idle');
    });

    it('coalesces several milestones crossed by one throttled background tick', async () => {
      const baseTime = new Date(2026, 7, 27, 8, 14, 0).getTime();
      vi.setSystemTime(baseTime);
      const onAnnounce = vi.fn();
      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '08:30',
            label: 'Wyjście z domu',
            smartDensity: true,
          },
        },
        { onAnnounce }
      );

      await engine.start();
      const tick = (engine as unknown as { handleTick(timestamp: number): void }).handleTick.bind(engine);
      tick(baseTime + 12 * 60 * 1000);
      await Promise.resolve();
      tick(baseTime + 12 * 60 * 1000 + 250);

      expect(onAnnounce).toHaveBeenCalledTimes(1);
      expect(onAnnounce.mock.calls[0][0].reason).toBe('interval');
      engine.stop();
    });

    it('drops paused milestone history and applies a changed cadence from the next future threshold', async () => {
      const baseTime = new Date(2026, 7, 27, 8, 10, 0).getTime();
      vi.setSystemTime(baseTime);
      const onAnnounce = vi.fn();
      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '08:30',
            label: 'Wyjście z domu',
            smartDensity: true,
          },
        },
        { onAnnounce }
      );

      await engine.start();
      engine.pause();
      vi.setSystemTime(baseTime + 15 * 60 * 1000);
      engine.updateSettings({
        departure: {
          ...engine.getSettings().departure,
          smartDensity: false,
          intervalMinutes: 2,
        },
      });
      await engine.resume();
      expect(onAnnounce).not.toHaveBeenCalled();

      const tick = (engine as unknown as { handleTick(timestamp: number): void }).handleTick.bind(engine);
      tick(baseTime + 16 * 60 * 1000);
      expect(onAnnounce).toHaveBeenCalledTimes(1);
      engine.stop();
    });

    it('applies a live departure cadence from the next future milestone without replaying one already passed', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 8, 16, 0));
      const onAnnounce = vi.fn();
      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '08:30',
            label: 'Wyjście z domu',
            smartDensity: false,
            intervalMinutes: 2,
          },
        },
        { onAnnounce }
      );

      await engine.start();
      engine.updateSettings({
        departure: { ...engine.getSettings().departure, smartDensity: true },
      });
      await vi.advanceTimersByTimeAsync(250);
      expect(onAnnounce).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
      expect(onAnnounce).toHaveBeenCalledTimes(1);
      engine.stop();
    });

    it('triggers milestone announcements at 15m, 10m, 5m, 1m, 0m with smartDensity', async () => {
      // Start at 08:14:00, target is 08:30:00 (16 minutes remaining)
      const baseDate = new Date(2026, 7, 27, 8, 14, 0);
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const states: ClockState[] = [];
      const ticks: TickPayload[] = [];

      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '08:30',
            label: 'Wyjście z domu',
            smartDensity: true,
          },
          chimeEnabled: true,
        },
        {
          onAnnounce: (a) => announcements.push(a),
          onStateChange: (s) => states.push(s),
          onTick: (t) => ticks.push(t),
        }
      );

      await engine.start();
      expect(announcements.length).toBe(0); // 16m left -> not a milestone

      // 1. Advance to 08:15:00 (15m left) -> Milestone 15
      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(announcements.length).toBe(1);
      expect(announcements[0].text).toContain('Za 15 minut: Wyjście z domu');
      expect(announcements[0].text).toContain('Jest 08:15');
      expect(announcements[0].reason).toBe('interval');

      // 2. Advance to 08:20:00 (10m left) -> Milestone 10
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(announcements.length).toBe(2);
      expect(announcements[1].text).toBe('Za 10 minut: Wyjście z domu.');

      // 3. Advance to 08:25:00 (5m left) -> Milestone 5
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(announcements.length).toBe(3);
      expect(announcements[2].text).toBe('Za 5 minut: Wyjście z domu.');

      // 4. Advance to 08:26:00 (4m left) -> Milestone 4
      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(announcements.length).toBe(4);
      expect(announcements[3].text).toBe('Za 4 minuty: Wyjście z domu.');

      // 5. Advance to 08:27:00 (3m left) -> Milestone 3
      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(announcements.length).toBe(5);
      expect(announcements[4].text).toBe('Za 3 minuty: Wyjście z domu.');

      // 6. Advance to 08:28:00 (2m left) -> Milestone 2
      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(announcements.length).toBe(6);
      expect(announcements[5].text).toBe('Za 2 minuty: Wyjście z domu.');

      // 7. Advance to 08:29:00 (1m left) -> Milestone 1
      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(announcements.length).toBe(7);
      expect(announcements[6].text).toBe('Za minutę: Wyjście z domu.');

      // 8. Advance to 08:30:00 (0m left) -> Final milestone & stop
      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(announcements.length).toBe(8);
      expect(announcements[7].text).toContain('Czas na: Wyjście z domu!');
      expect(announcements[7].text).toContain('08:30');
      expect(announcements[7].reason).toBe('session_end');

      // Engine automatically stopped
      expect(engine.getState()).toBe('idle');
    });

    it('stops a finished departure countdown exactly once when audio scheduling fails', async () => {
      vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0));
      voicePlayerMocks.schedule.mockImplementationOnce(() => {
        throw new Error('departure-final-audio-failed');
      });
      const onAnnounce = vi.fn();
      const onError = vi.fn();
      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '10:01',
            label: 'Spotkanie',
            smartDensity: false,
            intervalMinutes: 5,
            customMilestonesMinutes: [0],
          },
        },
        { onAnnounce, onError }
      );

      await engine.start();
      await vi.advanceTimersByTimeAsync(60_500);
      await vi.advanceTimersByTimeAsync(1_000);

      expect(engine.getState()).toBe('idle');
      expect(onAnnounce).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('triggers regular interval announcements (e.g. every 2 minutes) when smartDensity is false', async () => {
      // Start at 08:20:00, target 08:26:00 (6 min remaining, interval: 2 min)
      const baseDate = new Date(2026, 7, 27, 8, 20, 0);
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '08:26',
            label: 'Spotkanie',
            smartDensity: false,
            intervalMinutes: 2,
          },
        },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.start();
      expect(announcements.length).toBe(0);

      // Advance 2 min -> 08:22:00 (4 min left) -> triggers
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(announcements.length).toBe(1);
      expect(announcements[0].text).toBe('Za 4 minuty: Spotkanie.');

      // Advance 2 min -> 08:24:00 (2 min left) -> triggers
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(announcements.length).toBe(2);
      expect(announcements[1].text).toBe('Za 2 minuty: Spotkanie.');

      // Advance 2 min -> 08:26:00 (0 min left) -> triggers done & stops
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(announcements.length).toBe(3);
      expect(announcements[2].text).toContain('Czas na: Spotkanie!');
      expect(engine.getState()).toBe('idle');
    });

    it('triggers custom milestones when smartDensity is false and customMilestonesMinutes is provided', async () => {
      // Start at 08:10:00, target 08:30:00 (20 min remaining)
      const baseDate = new Date(2026, 7, 27, 8, 10, 0);
      vi.setSystemTime(baseDate);

      const announcements: AnnouncementPayload[] = [];
      const engine = new BackgroundTimerEngine(
        {
          mode: 'departure',
          departure: {
            targetTime: '08:30',
            label: 'Pociąg',
            smartDensity: false,
            intervalMinutes: 5,
            customMilestonesMinutes: [10, 2, 0],
          },
        },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.start();

      // Advance to 15m remaining (08:15:00) -> 15 is NOT in [10, 2, 0], should not trigger
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(announcements.length).toBe(0);

      // Advance to 10m remaining (08:20:00) -> Milestone 10 triggers
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(announcements.length).toBe(1);
      expect(announcements[0].text).toBe('Za 10 minut: Pociąg.');

      // Advance to 5m remaining (08:25:00) -> 5 is NOT in [10, 2, 0], should not trigger
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(announcements.length).toBe(1);

      // Advance to 2m remaining (08:28:00) -> Milestone 2 triggers
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
      expect(announcements.length).toBe(2);
      expect(announcements[1].text).toBe('Za 2 minuty: Pociąg.');

      // Advance to 0m remaining (08:30:00) -> Milestone 0 triggers and engine stops
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(announcements.length).toBe(3);
      expect(announcements[2].text).toContain('Czas na: Pociąg!');
      expect(engine.getState()).toBe('idle');
    });

    it('updates MediaSession with departure countdown metadata', async () => {
      const baseDate = new Date(2026, 7, 27, 8, 15, 0);
      vi.setSystemTime(baseDate);

      const mockMediaSession = {
        metadata: null as any,
        playbackState: 'none',
        setActionHandler: vi.fn(),
      };

      Object.defineProperty(navigator, 'mediaSession', {
        value: mockMediaSession,
        configurable: true,
        writable: true,
      });

      const engine = new BackgroundTimerEngine({
        mode: 'departure',
        departure: {
          targetTime: '08:30',
          label: 'Wyjście do pracy',
          smartDensity: true,
        },
      });

      await engine.start();

      expect(mockMediaSession.metadata.title).toContain('Za 15 min: Wyjście do pracy');
      expect(mockMediaSession.metadata.artist).toBe('Narzędziownik Ani');

      engine.stop();
    });
  });
});

describe('WakeLockService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('checks support correctly', () => {
    const service = new WakeLockService();
    expect(typeof service.isSupported()).toBe('boolean');
  });

  it('requests screen wake lock and releases it cleanly', async () => {
    const mockSentinel = {
      released: false,
      release: vi.fn().mockImplementation(async () => {
        mockSentinel.released = true;
      }),
      onrelease: null,
    };

    const mockWakeLock = {
      request: vi.fn().mockResolvedValue(mockSentinel),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      configurable: true,
      writable: true,
    });

    const service = new WakeLockService();
    const result = await service.request();

    expect(result).toBe(true);
    expect(service.isActive()).toBe(true);
    expect(mockWakeLock.request).toHaveBeenCalledWith('screen');

    await service.release();
    expect(service.isActive()).toBe(false);
    expect(mockSentinel.release).toHaveBeenCalled();
  });

  it('re-acquires wake lock on visibility change when tab becomes visible', async () => {
    const mockSentinel = {
      released: false,
      release: vi.fn(),
      onrelease: null,
    };

    const mockWakeLock = {
      request: vi.fn().mockResolvedValue(mockSentinel),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      configurable: true,
      writable: true,
    });

    const service = new WakeLockService();
    await service.request();
    expect(mockWakeLock.request).toHaveBeenCalledTimes(1);

    // Simulate tab backgrounding releasing sentinel
    mockSentinel.released = true;

    // Simulate tab becoming visible again
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });

    document.dispatchEvent(new Event('visibilitychange'));

    // Wait a tick for async handler
    await Promise.resolve();

    expect(mockWakeLock.request).toHaveBeenCalledTimes(2);

    await service.release();
  });

  it('handles request rejection gracefully without throwing', async () => {
    const mockWakeLock = {
      request: vi.fn().mockRejectedValue(new Error('Permission denied')),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      configurable: true,
      writable: true,
    });

    const service = new WakeLockService();
    const result = await service.request();

    expect(result).toBe(false);
    expect(service.isActive()).toBe(false);
    await service.release();
  });

  it('keeps the newest lock when an older request resolves after release and retry', async () => {
    let finishFirst!: (sentinel: WakeLockSentinel) => void;
    let finishSecond!: (sentinel: WakeLockSentinel) => void;
    let firstReleased = false;
    let secondReleased = false;
    const firstSentinel = {
      get released() { return firstReleased; },
      release: vi.fn(async () => { firstReleased = true; }),
      onrelease: null,
    } as unknown as WakeLockSentinel;
    const secondSentinel = {
      get released() { return secondReleased; },
      release: vi.fn(async () => { secondReleased = true; }),
      onrelease: null,
    } as unknown as WakeLockSentinel;
    const request = vi.fn()
      .mockReturnValueOnce(new Promise<WakeLockSentinel>((resolve) => { finishFirst = resolve; }))
      .mockReturnValueOnce(new Promise<WakeLockSentinel>((resolve) => { finishSecond = resolve; }));
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request }, configurable: true, writable: true,
    });
    const service = new WakeLockService();

    const first = service.request();
    await service.release();
    const second = service.request();
    finishSecond(secondSentinel);
    await second;
    finishFirst(firstSentinel);
    await first;

    expect(firstSentinel.release).toHaveBeenCalledTimes(1);
    expect(secondSentinel.release).not.toHaveBeenCalled();
    expect(service.isActive()).toBe(true);
    await service.release();
    expect(secondSentinel.release).toHaveBeenCalledTimes(1);
  });

  it('shares one pending platform request with a simultaneous visibility reacquire', async () => {
    let finishRequest!: (sentinel: WakeLockSentinel) => void;
    let released = false;
    const sentinel = {
      get released() { return released; },
      release: vi.fn(async () => { released = true; }),
      onrelease: null,
    } as unknown as WakeLockSentinel;
    const request = vi.fn().mockReturnValue(
      new Promise<WakeLockSentinel>((resolve) => { finishRequest = resolve; })
    );
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request }, configurable: true, writable: true,
    });
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible', configurable: true, writable: true,
    });
    const service = new WakeLockService();

    const explicitRequest = service.request();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(1);

    finishRequest(sentinel);
    await explicitRequest;
    await Promise.resolve();
    expect(service.isActive()).toBe(true);
    await service.release();
    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });

  it('reuses an active sentinel across repeated requests', async () => {
    let released = false;
    const sentinel = {
      get released() { return released; },
      release: vi.fn(async () => { released = true; }),
      onrelease: null,
    } as unknown as WakeLockSentinel;
    const request = vi.fn().mockResolvedValue(sentinel);
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request }, configurable: true, writable: true,
    });
    const service = new WakeLockService();

    await service.request();
    await service.request();

    expect(request).toHaveBeenCalledTimes(1);
    await service.release();
    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });
});

describe('SilentAudioLoop', () => {
  let originalAudioContext: any;

  beforeEach(() => {
    originalAudioContext = (window as any).AudioContext;
  });

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
  });

  it('starts silent audio oscillator and cleans up on stop', async () => {
    const mockOscillator = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };

    const mockGain = {
      gain: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    const mockCtx = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGain),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    (window as any).AudioContext = vi.fn().mockImplementation(() => mockCtx);

    const loop = new SilentAudioLoop();
    const started = await loop.start();

    expect(started).toBe(true);
    expect(loop.isActive()).toBe(true);
    expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.00001, 0);
    expect(mockOscillator.start).toHaveBeenCalled();

    loop.stop();
    expect(loop.isActive()).toBe(false);
    expect(mockOscillator.stop).toHaveBeenCalled();
    expect(mockCtx.close).toHaveBeenCalled();
  });

  it('handles suspended audio context by calling resume()', async () => {
    const mockCtx = {
      state: 'suspended',
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn().mockReturnValue({
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
      }),
      createGain: vi.fn().mockReturnValue({
        gain: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    (window as any).AudioContext = vi.fn().mockImplementation(() => mockCtx);

    const loop = new SilentAudioLoop();
    await loop.start();

    expect(mockCtx.resume).toHaveBeenCalled();
    loop.stop();
  });

  it('does not let an older delayed start create a second oscillator', async () => {
    let finishResume!: () => void;
    const resumePromise = new Promise<void>((resolve) => { finishResume = resolve; });
    const resume = vi.fn(() => resumePromise);
    const oscillator = {
      type: 'sine', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(),
      start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(),
    };
    const gain = {
      gain: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(),
    };
    const context = {
      state: 'suspended', currentTime: 0, destination: {}, resume,
      createOscillator: vi.fn().mockReturnValue(oscillator),
      createGain: vi.fn().mockReturnValue(gain),
    } as unknown as AudioContext;
    const loop = new SilentAudioLoop(context);

    const first = loop.start(context);
    const second = loop.start(context);
    finishResume();
    await Promise.all([first, second]);

    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    expect(loop.isActive()).toBe(true);
    loop.stop();
  });
});
