import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeakingClockModule } from './SpeakingClockModule';
import { getToolById } from '../../core/registry';
import { czasIds } from './testIds';

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

vi.mock('./services/spriteSpeechPlayer', () => ({
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

vi.mock('../../lib/audio/chime', () => ({
  playChime: vi.fn(async () => {}),
  scheduleChime: vi.fn((_context, startAt) => ({ startAt, endAt: startAt + 0.8, stop: vi.fn() })),
  stopChime: vi.fn(),
  isWebAudioSupported: vi.fn(() => true),
}));

vi.mock('./services/wakeLockService', () => ({
  WakeLockService: vi.fn().mockImplementation(() => ({
    request: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(true),
    isLocked: vi.fn(() => false),
    isSupported: vi.fn(() => true),
  })),
}));

vi.mock('./services/silentAudioLoop', () => ({
  SilentAudioLoop: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isPlaying: vi.fn(() => false),
  })),
}));
/**
 * Testy integracyjne modułu Czas.
 *
 * Selektory to role ARIA i identyfikatory ze stałych — ani jednego polskiego
 * literału. Za brzmienie napisów odpowiada src/copy/copy.test.ts, za geometrię
 * tarczy discGeometry.test.ts, a za silniki ich własne testy.
 */
describe('Moduł Czas', () => {
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

  it('jest zarejestrowany jako narzędzie o niezmienionym identyfikatorze', () => {
    const tool = getToolById('speaking-clock');
    expect(tool).toBeDefined();
    expect(tool?.component).toBe(SpeakingClockModule);
  });

  it('pokazuje tarczę od razu, bez przewijania, we wszystkich trzech trybach', async () => {
    const user = userEvent.setup();
    render(<SpeakingClockModule />);

    for (const mode of ['continuous', 'focus', 'departure']) {
      await user.click(screen.getByTestId(czasIds.modeTab(mode)));
      const disc = screen.getByTestId(czasIds.disc);
      expect(disc).toBeInTheDocument();

      // tarcza musi stać PRZED wierszem ustawień i akcją główną w kolejności dokumentu,
      // bo wcześniej formularz konfiguracji spychał ją poniżej zgięcia ekranu
      const row = screen.getByTestId(czasIds.settingsRow);
      expect(disc.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('tarcza jest paskiem postępu z nazwą dostępną', () => {
    render(<SpeakingClockModule />);
    expect(screen.getByRole('progressbar')).toHaveAccessibleName();
  });

  it('startuje, pauzuje, wznawia i zatrzymuje', async () => {
    const user = userEvent.setup();
    render(<SpeakingClockModule />);

    expect(screen.getByTestId(czasIds.statusBadge)).toBeInTheDocument();
    const idleLabel = screen.getByTestId(czasIds.statusBadge).textContent;

    await user.click(screen.getByTestId(czasIds.primaryAction));
    await waitFor(() =>
      expect(screen.getByTestId(czasIds.statusBadge).textContent).not.toBe(idleLabel)
    );
  });

  it('blokuje zmianę trybu, gdy zegar pracuje', async () => {
    const user = userEvent.setup();
    render(<SpeakingClockModule />);

    await user.click(screen.getByTestId(czasIds.primaryAction));
    await waitFor(() => {
      expect(screen.getByTestId(czasIds.modeTab('focus'))).toBeDisabled();
    });
  });

  it('pozwala zmienić interwał bez pauzowania działającego zegara', async () => {
    const user = userEvent.setup();
    render(<SpeakingClockModule />);

    await user.click(screen.getByTestId(czasIds.primaryAction));
    await waitFor(() => expect(screen.getByTestId(czasIds.modeTab('focus'))).toBeDisabled());
    const runningStatus = screen.getByTestId(czasIds.statusBadge).textContent;

    await user.click(screen.getByTestId(czasIds.settingsRow));
    await screen.findByRole('dialog');
    const tenMinutes = screen.getByTestId(czasIds.intervalPreset(10));
    expect(tenMinutes).toBeEnabled();

    await user.click(tenMinutes);
    expect(tenMinutes).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId(czasIds.statusBadge).textContent).toBe(runningStatus);
  });

  it('pozwala zmienić kadencję wyjścia bez odblokowania celu działającego odliczania', async () => {
    const user = userEvent.setup();
    render(<SpeakingClockModule />);

    await user.click(screen.getByTestId(czasIds.modeTab('departure')));
    await user.click(screen.getByTestId(czasIds.primaryAction));
    await waitFor(() => expect(screen.getByTestId(czasIds.modeTab('focus'))).toBeDisabled());
    const runningStatus = screen.getByTestId(czasIds.statusBadge).textContent;

    await user.click(screen.getByTestId(czasIds.settingsRow));
    await screen.findByRole('dialog');
    expect(screen.getByTestId(czasIds.departureTime)).toBeDisabled();
    const fiveMinutes = screen.getByTestId(czasIds.cadenceFixed(5));
    expect(fiveMinutes).toBeEnabled();

    await user.click(fiveMinutes);
    expect(fiveMinutes).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId(czasIds.statusBadge).textContent).toBe(runningStatus);
  });

  it('wiersz podsumowania otwiera arkusz ustawień', async () => {
    const user = userEvent.setup();
    render(<SpeakingClockModule />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByTestId(czasIds.settingsRow));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId(czasIds.sheet)).toBeInTheDocument();
  });

  it('arkusz ma trzy zakładki ustawień', async () => {
    const user = userEvent.setup();
    render(<SpeakingClockModule />);
    await user.click(screen.getByTestId(czasIds.settingsRow));
    await screen.findByRole('dialog');

    for (const tab of ['mode', 'voice', 'dial']) {
      expect(screen.getByTestId(czasIds.sheetTab(tab))).toBeInTheDocument();
    }
  });

  it('nie pokazuje ostrzeżenia, gdy pakiet offline jest gotowy', async () => {
    render(<SpeakingClockModule />);
    await waitFor(() => expect(screen.queryByTestId(czasIds.voicePackLoading)).not.toBeInTheDocument());
    expect(screen.queryByTestId(czasIds.voicePackFailure)).not.toBeInTheDocument();
  });

  it('blokuje Start i ostrzega, gdy pakiet offline nie może się przygotować', async () => {
    voicePlayerMocks.state = 'failed';
    voicePlayerMocks.prepare.mockResolvedValueOnce({
      status: 'failed',
      code: 'sprite-unavailable',
      message: 'offline',
    } as never);
    render(<SpeakingClockModule />);

    expect(await screen.findByTestId(czasIds.voicePackFailure)).toBeInTheDocument();
    expect(screen.getByTestId(czasIds.primaryAction)).toBeDisabled();
  });

  it('pokazuje błąd odtwarzania i pozwala ponowić test bez zatrzymywania zegara', async () => {
    voicePlayerMocks.schedule.mockImplementationOnce(() => {
      throw new Error('missing-fragment');
    });
    const user = userEvent.setup();
    render(<SpeakingClockModule />);

    await user.click(screen.getByTestId(czasIds.primaryAction));
    const runningStatus = screen.getByTestId(czasIds.statusBadge).textContent;
    await user.click(screen.getByTestId(czasIds.settingsRow));
    await user.click(screen.getByTestId(czasIds.sheetTab('voice')));
    await user.click(screen.getByTestId(czasIds.secondaryAction));

    expect(await screen.findByTestId(czasIds.speechFailure)).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId(czasIds.statusBadge).textContent).toBe(runningStatus);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByTestId(czasIds.retryVoice));
    await waitFor(() => expect(screen.queryByTestId(czasIds.speechFailure)).not.toBeInTheDocument());
    expect(screen.getByTestId(czasIds.statusBadge).textContent).toBe(runningStatus);
  });

  it('pokazuje szybkie korekty czasu dopiero po starcie odliczania', async () => {
    const user = userEvent.setup();
    render(<SpeakingClockModule />);

    await user.click(screen.getByTestId(czasIds.modeTab('departure')));
    expect(screen.queryByTestId(czasIds.quickAdjust(5))).not.toBeInTheDocument();

    await user.click(screen.getByTestId(czasIds.primaryAction));
    await waitFor(() => {
      expect(screen.getByTestId(czasIds.quickAdjust(5))).toBeInTheDocument();
    });
  });

  it('nie renderuje już ścieżki bez tarczy', () => {
    render(<SpeakingClockModule />);
    // pole timeTimer.enabled zniknęło razem z ClockDisplay i TimeProgressRing
    expect(screen.getByTestId(czasIds.disc)).toBeInTheDocument();
  });
});
