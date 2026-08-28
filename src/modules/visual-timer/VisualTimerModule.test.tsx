import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { VisualTimerModule } from './components/VisualTimerModule';
import { useVisualTimerStore, DEFAULT_TIMER_PRESETS } from './store';
import { skupienieIds as ids } from './testIds';

/**
 * Widok Skupienia.
 *
 * Ten plik nie importuje warstwy tekstów — inaczej przechodziłby także dla
 * interfejsu po angielsku, a dokładnie z takiego stanu ten moduł wychodzi.
 * Selektory idą po rolach i po identyfikatorach z testIds.ts.
 *
 * Poprzednia wersja testowała zaślepkę: „focus", „of 25m" i setInterval
 * mieszkający w komponencie. Nic z tego nie istnieje.
 */

/** Minimalne Web Audio — jsdom nie ma go wcale. */
function stubAudioContext() {
  const gain = {
    gain: { value: 0, linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const source = {
    loop: false,
    buffer: null as unknown,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };
  const ctx = {
    state: 'suspended',
    sampleRate: 8000,
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gain),
    createBufferSource: vi.fn(() => source),
    createBuffer: vi.fn((_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
  };

  vi.stubGlobal('AudioContext', vi.fn(() => ctx));
  return { ctx, gain, source };
}

/** Radix aktywuje zakładkę na mouseDown, nie na click. */
const activateTab = (element: HTMLElement) => fireEvent.mouseDown(element);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useVisualTimerStore.setState({
    presets: DEFAULT_TIMER_PRESETS,
    activePresetId: null,
    currentPhase: null,
    timeRemainingSeconds: 0,
    totalPhaseSeconds: 0,
    isRunning: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Skupienie — wejście w sesję', () => {
  it('zaczyna od wyboru bloku pracy, a nie od licznika', () => {
    render(<VisualTimerModule />);

    expect(screen.getByTestId(ids.presetPicker('ekran'))).toBeInTheDocument();
    expect(screen.getByTestId(ids.presetStart('ekran', 'p-1'))).toBeInTheDocument();
    expect(screen.getByTestId(ids.presetStart('ekran', 'p-2'))).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('każda karta rozpisuje trzy fazy presetu', () => {
    render(<VisualTimerModule />);

    const plan = screen.getByTestId(ids.presetBreakdown('ekran', 'p-1'));
    expect(plan).toHaveTextContent('2');
    expect(plan).toHaveTextContent('25');
    expect(plan).toHaveTextContent('3');
  });

  it('start pierwszego bloku otwiera rozgrzewkę na 2 minuty', () => {
    render(<VisualTimerModule />);

    fireEvent.click(screen.getByTestId(ids.presetStart('ekran', 'p-1')));

    expect(useVisualTimerStore.getState().currentPhase).toBe('warmup');
    expect(screen.getByTestId(ids.discValue)).toHaveTextContent('02:00');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByTestId(ids.presetPicker('ekran'))).not.toBeInTheDocument();
  });
});

describe('Skupienie — bieg sesji', () => {
  it('licznik odlicza sekundę po sekundzie', () => {
    render(<VisualTimerModule />);
    fireEvent.click(screen.getByTestId(ids.presetStart('ekran', 'p-1')));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId(ids.discValue)).toHaveTextContent('01:59');

    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(screen.getByTestId(ids.discValue)).toHaveTextContent('01:00');
  });

  it('pauza zatrzymuje odliczanie, a powrót je wznawia', () => {
    render(<VisualTimerModule />);
    fireEvent.click(screen.getByTestId(ids.presetStart('ekran', 'p-1')));

    fireEvent.click(screen.getByTestId(ids.primaryAction));
    expect(useVisualTimerStore.getState().isRunning).toBe(false);
    expect(screen.getByTestId(ids.statusBadge)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId(ids.discValue)).toHaveTextContent('02:00');

    fireEvent.click(screen.getByTestId(ids.primaryAction));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId(ids.discValue)).toHaveTextContent('01:59');
  });

  it('pominięcie fazy przenosi na oś do skupienia', () => {
    render(<VisualTimerModule />);
    fireEvent.click(screen.getByTestId(ids.presetStart('ekran', 'p-1')));

    expect(screen.getByTestId(ids.timelinePhase('warmup'))).toHaveAttribute('aria-current', 'step');

    fireEvent.click(screen.getByTestId(ids.skipAction));

    expect(screen.getByTestId(ids.timelinePhase('flow'))).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId(ids.timelinePhase('warmup'))).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId(ids.discValue)).toHaveTextContent('25:00');
  });

  it('zatrzymanie wraca do wyboru bloku', () => {
    render(<VisualTimerModule />);
    fireEvent.click(screen.getByTestId(ids.presetStart('ekran', 'p-1')));

    fireEvent.click(screen.getByTestId(ids.stopAction));

    expect(screen.getByTestId(ids.presetPicker('ekran'))).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('podnosi sesję zapisaną w store, zamiast zaczynać od zera', () => {
    useVisualTimerStore.setState({
      activePresetId: 'p-2',
      currentPhase: 'flow',
      timeRemainingSeconds: 754,
      totalPhaseSeconds: 900,
      isRunning: false,
    });

    render(<VisualTimerModule />);

    expect(screen.getByTestId(ids.discValue)).toHaveTextContent('12:34');
    expect(screen.getByTestId(ids.timelinePhase('flow'))).toHaveAttribute('aria-current', 'step');
  });
});

describe('Skupienie — ustawienia', () => {
  it('koło zębate otwiera arkusz z blokami pracy', () => {
    render(<VisualTimerModule />);

    fireEvent.click(screen.getByTestId(ids.settingsAction));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId(ids.presetStart('arkusz', 'p-2'))).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('wybór bloku w arkuszu zaczyna sesję i zamyka arkusz', () => {
    render(<VisualTimerModule />);
    fireEvent.click(screen.getByTestId(ids.settingsAction));

    fireEvent.click(screen.getByTestId(ids.presetStart('arkusz', 'p-2')));

    expect(useVisualTimerStore.getState().activePresetId).toBe('p-2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId(ids.discValue)).toHaveTextContent('05:00');
  });
});

describe('Skupienie — dźwięk tła', () => {
  it('przycisk dźwięku odblokowuje AudioContext i naprawdę go uruchamia', () => {
    const { ctx, gain, source } = stubAudioContext();
    render(<VisualTimerModule />);

    fireEvent.click(screen.getByTestId(ids.ambienceSound('rain')));

    expect(source.start).toHaveBeenCalled();
    // bez resume() po geście iOS zostawia kontekst wstrzymany — i jest cisza
    expect(ctx.resume).toHaveBeenCalled();
    // głośność dochodzi rampą, nie skokiem
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(screen.getByTestId(ids.ambienceSound('rain'))).toHaveAttribute('aria-pressed', 'true');
  });

  it('ponowne dotknięcie tego samego dźwięku ucisza tło', () => {
    const { source } = stubAudioContext();
    render(<VisualTimerModule />);

    fireEvent.click(screen.getByTestId(ids.ambienceSound('brown-noise')));
    fireEvent.click(screen.getByTestId(ids.ambienceSound('brown-noise')));

    expect(source.stop).toHaveBeenCalled();
    expect(screen.getByTestId(ids.ambienceSound('brown-noise'))).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('schowanie aplikacji ucisza tło', () => {
    const { source } = stubAudioContext();
    render(<VisualTimerModule />);
    fireEvent.click(screen.getByTestId(ids.ambienceSound('rain')));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(source.stop).toHaveBeenCalled();
    expect(screen.getByTestId(ids.ambienceSound('rain'))).toHaveAttribute('aria-pressed', 'false');

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('bez Web Audio przycisk nie udaje, że gra', () => {
    render(<VisualTimerModule />);

    fireEvent.click(screen.getByTestId(ids.ambienceSound('rain')));

    expect(screen.getByTestId(ids.ambienceSound('rain'))).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId(ids.ambienceNotice)).toBeInTheDocument();
  });

  it('ma suwak głośności z nazwą dostępną', () => {
    render(<VisualTimerModule />);

    expect(screen.getByTestId(ids.ambienceVolume)).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });
});

describe('Skupienie — tryby', () => {
  it('ma dwie zakładki, a oddech ma własny widok', () => {
    render(<VisualTimerModule />);

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.queryByTestId(ids.breathing)).not.toBeInTheDocument();

    activateTab(screen.getByTestId(ids.modeTab('oddech')));

    expect(screen.getByTestId(ids.breathing)).toBeInTheDocument();
    expect(screen.getByTestId(ids.breathingToggle)).toBeInTheDocument();
  });
});
