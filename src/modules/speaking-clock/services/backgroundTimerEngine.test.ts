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
import * as chimeSynthesizer from './chimeSynthesizer';
import * as speechService from './speechService';
import { WakeLockService } from './wakeLockService';
import { SilentAudioLoop } from './silentAudioLoop';

// Mock dependencies
vi.mock('./chimeSynthesizer', () => ({
  playChime: vi.fn().mockResolvedValue(undefined),
  closeAudioContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./speechService', () => ({
  speakText: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
  isSpeechSynthesisSupported: vi.fn().mockReturnValue(true),
}));

describe('BackgroundTimerEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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
          playChimeBefore: true,
        },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.start();

      // Advance by 6 seconds (crossing 10:15:00)
      await vi.advanceTimersByTimeAsync(6000);

      expect(announcements.length).toBe(1);
      expect(announcements[0].reason).toBe('interval');
      expect(announcements[0].text).toContain('Piętnaście po dziesiątej');
      expect(chimeSynthesizer.playChime).toHaveBeenCalledTimes(1);
      expect(speechService.speakText).toHaveBeenCalledWith(
        expect.stringContaining('Piętnaście po dziesiątej'),
        expect.any(Object)
      );

      engine.stop();
    });

    it('does not play chime when playChimeBefore is false', async () => {
      const baseDate = new Date(2026, 7, 27, 10, 14, 58);
      vi.setSystemTime(baseDate);

      const engine = new BackgroundTimerEngine({
        intervalMinutes: 15,
        clockSync: true,
        playChimeBefore: false,
      });

      await engine.start();
      await vi.advanceTimersByTimeAsync(3000);

      expect(chimeSynthesizer.playChime).not.toHaveBeenCalled();
      expect(speechService.speakText).toHaveBeenCalledTimes(1);

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
        { formatStyle: 'natural', playChimeBefore: true },
        { onAnnounce: (a) => announcements.push(a) }
      );

      await engine.triggerImmediateAnnouncement();

      expect(announcements.length).toBe(1);
      expect(announcements[0].reason).toBe('manual');
      expect(announcements[0].text).toContain('Dwunasta w południe');
      expect(chimeSynthesizer.playChime).toHaveBeenCalledTimes(1);
      expect(speechService.speakText).toHaveBeenCalledTimes(1);
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
        wakeLockEnabled: true,
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
    it('catches audio/speech errors and reports to onError callback', async () => {
      const error = new Error('Audio Context failure');
      vi.mocked(chimeSynthesizer.playChime).mockRejectedValueOnce(error);

      const onError = vi.fn();
      const engine = new BackgroundTimerEngine(
        { playChimeBefore: true },
        { onError }
      );

      await engine.triggerImmediateAnnouncement();

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('MediaSession Action Handlers execution', () => {
    it('executes play, pause, and stop actions triggered from system media notification', async () => {
      const handlers: Record<string, Function> = {};
      const mockMediaSession = {
        metadata: null as any,
        playbackState: 'none',
        setActionHandler: vi.fn((action, handler) => {
          handlers[action] = handler;
        }),
      };

      Object.defineProperty(navigator, 'mediaSession', {
        value: mockMediaSession,
        configurable: true,
        writable: true,
      });

      const engine = new BackgroundTimerEngine();
      await engine.start();

      expect(engine.getState()).toBe('running');

      // System triggers pause
      handlers['pause']?.();
      expect(engine.getState()).toBe('paused');

      // System triggers play
      handlers['play']?.();
      expect(engine.getState()).toBe('running');

      // System triggers stop
      handlers['stop']?.();
      expect(engine.getState()).toBe('idle');
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
});

