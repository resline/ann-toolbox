import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useSpeakingClock } from './useSpeakingClock';

const voicePlayerMocks = vi.hoisted(() => ({
  state: 'ready' as 'idle' | 'loading' | 'ready' | 'failed',
  prepare: vi.fn(async () => ({ status: 'ready' as const, decodedBytes: 1024, fragmentCount: 337 })),
  resume: vi.fn(async () => true),
  schedule: vi.fn(() => ({
    startAt: 1,
    endAt: 2,
    sources: [],
    done: Promise.resolve('completed' as const),
    reap: vi.fn(() => false),
    stop: vi.fn(),
  })),
  cancel: vi.fn(),
  release: vi.fn(),
  context: { currentTime: 0, state: 'running', destination: {} } as AudioContext,
}));

vi.mock('../services/spriteSpeechPlayer', () => ({
  SpriteSpeechPlayer: vi.fn().mockImplementation(() => ({
    prepare: voicePlayerMocks.prepare,
    getState: () => voicePlayerMocks.state,
    getAudioContext: () => voicePlayerMocks.context,
    resumeFromUserGesture: voicePlayerMocks.resume,
    schedule: voicePlayerMocks.schedule,
    cancel: voicePlayerMocks.cancel,
    release: voicePlayerMocks.release,
  })),
}));

vi.mock('../../../lib/audio/chime', () => ({
  playChime: vi.fn(async () => {}),
  scheduleChime: vi.fn((_context, startAt) => ({ startAt, endAt: startAt + 0.8, stop: vi.fn() })),
  stopChime: vi.fn(),
  isWebAudioSupported: vi.fn(() => true),
}));

vi.mock('../services/wakeLockService', () => ({
  WakeLockService: vi.fn().mockImplementation(() => ({
    request: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(true),
    isLocked: vi.fn(() => false),
    isSupported: vi.fn(() => true),
  })),
}));

vi.mock('../services/silentAudioLoop', () => ({
  SilentAudioLoop: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isPlaying: vi.fn(() => false),
  })),
}));
/**
 * Testy hooka spinającego silniki z widokiem. Przeniesione bez zmian z dawnego
 * SpeakingClockModule.test.tsx — to najlepsze testy w tym module: HookConsumer
 * używa data-testid, więc nie zawierają ani jednego literału interfejsu.
 */
describe('useSpeakingClock Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    voicePlayerMocks.state = 'ready';
    voicePlayerMocks.prepare.mockResolvedValue({ status: 'ready', decodedBytes: 1024, fragmentCount: 337 });
    voicePlayerMocks.resume.mockResolvedValue(true);
    voicePlayerMocks.schedule.mockImplementation(() => ({
      startAt: 1,
      endAt: 2,
      sources: [],
      done: Promise.resolve('completed' as const),
      reap: vi.fn(() => false),
      stop: vi.fn(),
    }));
  });

  function HookConsumer() {
    const clock = useSpeakingClock();
    return (
      <div>
        <span data-testid="state">{clock.clockState}</span>
        <span data-testid="interval">{clock.settings.intervalMinutes}</span>
        <span data-testid="mode">{clock.settings.mode}</span>
        <span data-testid="target-time">{clock.targetTime}</span>
        <span data-testid="departure-label">{clock.departureLabel}</span>
        <span data-testid="total-span">{clock.totalSpanSeconds}</span>
        <span data-testid="speech-failure">{clock.speechFailure?.status ?? ''}</span>
        <button onClick={() => clock.start()}>Start</button>
        <button onClick={() => clock.pause()}>Pause</button>
        <button onClick={() => clock.resume()}>Resume</button>
        <button onClick={() => clock.stop()}>Stop</button>
        <button onClick={() => clock.setIntervalMinutes(10)}>Set10Min</button>
        <button onClick={() => clock.setMode('focus')}>SetFocus</button>
        <button onClick={() => clock.setMode('departure')}>SetDeparture</button>
        <button onClick={() => clock.addMinutes(5)}>Add5Min</button>
        <button onClick={() => clock.setDepartureSettings({ targetTime: '12:00', label: 'Dentysta' })}>
          SetDepartureCustom
        </button>
        <button onClick={() => clock.setTimeTimerSettings({ color: 'ocean', showNumbers: false })}>
          SetTimeTimerCustom
        </button>
        <button onClick={() => clock.testVoiceNow()}>TestVoice</button>
        <button onClick={() => clock.retryVoicePack()}>RetryPack</button>
      </div>
    );
  }

  it('initializes with default settings and idle state', async () => {
    await act(async () => {
      render(<HookConsumer />);
    });
    expect(screen.getByTestId('state').textContent).toBe('idle');
    expect(screen.getByTestId('interval').textContent).toBe('5');
    expect(screen.getByTestId('mode').textContent).toBe('continuous');
    expect(screen.getByTestId('departure-label').textContent).toBe('Wyjście z domu');
  });

  it('manages state transitions start -> pause -> resume -> stop', async () => {
    await act(async () => {
      render(<HookConsumer />);
    });

    expect(screen.getByTestId('state').textContent).toBe('idle');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    });
    expect(screen.getByTestId('state').textContent).toBe('running');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    });
    expect(screen.getByTestId('state').textContent).toBe('paused');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    });
    expect(screen.getByTestId('state').textContent).toBe('running');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    });
    expect(screen.getByTestId('state').textContent).toBe('idle');
  });

  it('updates interval and persists in localStorage', async () => {
    await act(async () => {
      render(<HookConsumer />);
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Set10Min' }));
    });

    expect(screen.getByTestId('interval').textContent).toBe('10');
    const saved = JSON.parse(localStorage.getItem('ann_speaking_clock_settings') || '{}');
    expect(saved.intervalMinutes).toBe(10);
  });

  it('updates the interval while the clock stays running', async () => {
    await act(async () => {
      render(<HookConsumer />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Set10Min' }));
    });

    expect(screen.getByTestId('state').textContent).toBe('running');
    expect(screen.getByTestId('interval').textContent).toBe('10');
    const saved = JSON.parse(localStorage.getItem('ann_speaking_clock_settings') || '{}');
    expect(saved.intervalMinutes).toBe(10);
  });

  it('updates departure settings and time timer settings via dedicated setters', async () => {
    await act(async () => {
      render(<HookConsumer />);
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'SetDepartureCustom' }));
    });
    expect(screen.getByTestId('target-time').textContent).toBe('12:00');
    expect(screen.getByTestId('departure-label').textContent).toBe('Dentysta');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'SetTimeTimerCustom' }));
    });
    const saved = JSON.parse(localStorage.getItem('ann_speaking_clock_settings') || '{}');
    expect(saved.timeTimer.color).toBe('ocean');
    expect(saved.timeTimer.showNumbers).toBe(false);
  });

  it('adjusts minutes via addMinutes', async () => {
    await act(async () => {
      render(<HookConsumer />);
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Add5Min' }));
    });

    // In continuous mode, interval is adjusted +5 min (from 5 to 10)
    expect(screen.getByTestId('interval').textContent).toBe('10');
  });

  it('triggers test voice now', async () => {
    await act(async () => {
      render(<HookConsumer />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'TestVoice' }));
    });

    expect(voicePlayerMocks.schedule).toHaveBeenCalled();
  });

  it('forces an atomic cache refresh when the user retries the voice pack', async () => {
    await act(async () => {
      render(<HookConsumer />);
    });
    voicePlayerMocks.prepare.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'RetryPack' }));
    });

    expect(voicePlayerMocks.prepare).toHaveBeenCalledWith(true);
  });

  it('exposes a speech start failure and clears it after a successful retry', async () => {
    voicePlayerMocks.schedule
      .mockImplementationOnce(() => {
        throw new Error('missing-fragment');
      })
      .mockImplementationOnce(() => ({
        startAt: 1,
        endAt: 2,
        sources: [],
        done: Promise.resolve('completed' as const),
        reap: vi.fn(() => false),
        stop: vi.fn(),
      }));

    await act(async () => {
      render(<HookConsumer />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'TestVoice' }));
    });
    expect(screen.getByTestId('speech-failure').textContent).toBe('failed');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'TestVoice' }));
    });
    expect(screen.getByTestId('speech-failure').textContent).toBe('');
  });
});
