import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useSpeakingClock } from './hooks/useSpeakingClock';
import { ClockDisplay } from './components/ClockDisplay';
import { TimeProgressRing } from './components/TimeProgressRing';
import { PresetPills } from './components/PresetPills';
import { ClockControls } from './components/ClockControls';
import { ClockSettingsModal } from './components/ClockSettingsModal';
import { SpeakingClockModule } from './SpeakingClockModule';
import { getToolById } from '../../core/registry';
import * as speechService from './services/speechService';
import {
  type SpeakingClockSettings,
  DEFAULT_SPEAKING_CLOCK_SETTINGS,
} from './types';

// Mock Web Speech & Chime services
vi.mock('./services/speechService', () => ({
  isSpeechSynthesisSupported: vi.fn(() => true),
  getAllVoices: vi.fn(async () => [
    { voiceURI: 'pl-voice-1', name: 'Zosia PL', lang: 'pl-PL', default: true } as SpeechSynthesisVoice,
    { voiceURI: 'pl-voice-2', name: 'Krzysztof PL', lang: 'pl-PL', default: false } as SpeechSynthesisVoice,
  ]),
  getPolishVoices: vi.fn(async () => [
    { voiceURI: 'pl-voice-1', name: 'Zosia PL', lang: 'pl-PL', default: true } as SpeechSynthesisVoice,
    { voiceURI: 'pl-voice-2', name: 'Krzysztof PL', lang: 'pl-PL', default: false } as SpeechSynthesisVoice,
  ]),
  speakText: vi.fn(async () => {}),
  stopSpeaking: vi.fn(),
  isSpeaking: vi.fn(() => false),
}));

vi.mock('./services/chimeSynthesizer', () => ({
  playChime: vi.fn(async () => {}),
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

describe('Speaking Clock UI & Module', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('ClockDisplay Component', () => {
    it('renders current time with HH:MM:SS format', () => {
      const testDate = new Date(2026, 7, 27, 14, 5, 9); // 14:05:09
      render(<ClockDisplay currentTime={testDate} clockState="idle" />);

      expect(screen.getByLabelText(/14:05:09/i)).toBeInTheDocument();
    });

    it('renders formatted Polish date', () => {
      const testDate = new Date(2026, 7, 27, 14, 5, 9); // 27 sierpnia 2026, czwartek
      render(<ClockDisplay currentTime={testDate} clockState="idle" />);

      expect(screen.getByText(/27 sierpnia/i)).toBeInTheDocument();
    });

    it('shows correct status badges for idle, running, and paused states', () => {
      const testDate = new Date(2026, 7, 27, 14, 0, 0);

      const { rerender } = render(<ClockDisplay currentTime={testDate} clockState="idle" />);
      expect(screen.getByText(/gotowy|zatrzymany/i)).toBeInTheDocument();

      rerender(<ClockDisplay currentTime={testDate} clockState="running" />);
      expect(screen.getByText(/działa w tle/i)).toBeInTheDocument();

      rerender(<ClockDisplay currentTime={testDate} clockState="paused" />);
      expect(screen.getByText(/wstrzymany/i)).toBeInTheDocument();
    });
  });

  describe('TimeProgressRing Component', () => {
    it('renders countdown to next announcement and target time when running', () => {
      const nextTime = new Date(2026, 7, 27, 14, 15, 0);
      render(
        <TimeProgressRing
          secondsUntilNext={165} // 02:45
          nextAnnouncementTime={nextTime}
          progress={75}
          clockState="running"
          mode="continuous"
        />
      );

      expect(screen.getByText(/02:45/i)).toBeInTheDocument();
      expect(screen.getByText(/14:15/i)).toBeInTheDocument();
    });

    it('displays last announced text when provided', () => {
      render(
        <TimeProgressRing
          secondsUntilNext={120}
          nextAnnouncementTime={new Date(2026, 7, 27, 14, 30, 0)}
          progress={50}
          clockState="running"
          mode="continuous"
          lastAnnouncementText="Za piętnaście druga"
        />
      );

      expect(screen.getByText(/Za piętnaście druga/i)).toBeInTheDocument();
    });

    it('shows calm resting state message when idle', () => {
      render(
        <TimeProgressRing
          secondsUntilNext={0}
          nextAnnouncementTime={null}
          progress={0}
          clockState="idle"
          mode="continuous"
        />
      );

      expect(screen.getByText(/w spoczynku|gotowy|oczekiwanie/i)).toBeInTheDocument();
    });
  });

  describe('PresetPills Component', () => {
    it('renders all standard interval presets (1, 2, 5, 10, 15, 30, 60 min)', () => {
      const onSelect = vi.fn();
      render(<PresetPills intervalMinutes={15} onSelectInterval={onSelect} />);

      expect(screen.getByRole('button', { name: /^1 min$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^2 min$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^5 min$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^10 min$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^15 min$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^30 min$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^60 min$/i })).toBeInTheDocument();
    });

    it('marks active preset with aria-pressed', () => {
      render(<PresetPills intervalMinutes={15} onSelectInterval={vi.fn()} />);

      const activeBtn = screen.getByRole('button', { name: /^15 min$/i });
      expect(activeBtn).toHaveAttribute('aria-pressed', 'true');

      const inactiveBtn = screen.getByRole('button', { name: /^5 min$/i });
      expect(inactiveBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls onSelectInterval when a preset is clicked', () => {
      const onSelect = vi.fn();
      render(<PresetPills intervalMinutes={15} onSelectInterval={onSelect} />);

      fireEvent.click(screen.getByRole('button', { name: /^5 min$/i }));
      expect(onSelect).toHaveBeenCalledWith(5);
    });
  });

  describe('ClockControls Component', () => {
    it('shows Start button when idle', () => {
      const onStart = vi.fn();
      render(
        <ClockControls
          clockState="idle"
          onStart={onStart}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onStop={vi.fn()}
          onTestVoice={vi.fn()}
          onOpenSettings={vi.fn()}
        />
      );

      const startBtn = screen.getByRole('button', { name: /start/i });
      expect(startBtn).toBeInTheDocument();

      fireEvent.click(startBtn);
      expect(onStart).toHaveBeenCalled();
    });

    it('shows Pause and Stop buttons when running', () => {
      const onPause = vi.fn();
      const onStop = vi.fn();

      render(
        <ClockControls
          clockState="running"
          onStart={vi.fn()}
          onPause={onPause}
          onResume={vi.fn()}
          onStop={onStop}
          onTestVoice={vi.fn()}
          onOpenSettings={vi.fn()}
        />
      );

      const pauseBtn = screen.getByRole('button', { name: /pauza/i });
      const stopBtn = screen.getByRole('button', { name: /stop/i });

      expect(pauseBtn).toBeInTheDocument();
      expect(stopBtn).toBeInTheDocument();

      fireEvent.click(pauseBtn);
      expect(onPause).toHaveBeenCalled();

      fireEvent.click(stopBtn);
      expect(onStop).toHaveBeenCalled();
    });

    it('shows Resume and Stop buttons when paused', () => {
      const onResume = vi.fn();

      render(
        <ClockControls
          clockState="paused"
          onStart={vi.fn()}
          onPause={vi.fn()}
          onResume={onResume}
          onStop={vi.fn()}
          onTestVoice={vi.fn()}
          onOpenSettings={vi.fn()}
        />
      );

      const resumeBtn = screen.getByRole('button', { name: /wznów|start/i });
      expect(resumeBtn).toBeInTheDocument();

      fireEvent.click(resumeBtn);
      expect(onResume).toHaveBeenCalled();
    });

    it('triggers test voice and settings button clicks', () => {
      const onTest = vi.fn();
      const onSettings = vi.fn();

      render(
        <ClockControls
          clockState="idle"
          onStart={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onStop={vi.fn()}
          onTestVoice={onTest}
          onOpenSettings={onSettings}
        />
      );

      const testBtn = screen.getByRole('button', { name: /przetestuj|test/i });
      const settingsBtn = screen.getByRole('button', { name: /ustawienia/i });

      fireEvent.click(testBtn);
      expect(onTest).toHaveBeenCalled();

      fireEvent.click(settingsBtn);
      expect(onSettings).toHaveBeenCalled();
    });
  });

  describe('ClockSettingsModal Component', () => {
    const mockSettings: SpeakingClockSettings = {
      ...DEFAULT_SPEAKING_CLOCK_SETTINGS,
      intervalMinutes: 15,
      mode: 'continuous',
      formatStyle: 'natural',
      playChimeBefore: true,
      chimeEnabled: true,
      chimeTone: 'gentle',
      chimeVolume: 0.7,
      voiceURI: 'pl-voice-1',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      speechRate: 1.0,
      speechPitch: 1.0,
      speechVolume: 1.0,
      clockSync: true,
      focusDurationMinutes: 25,
      wakeLockEnabled: false,
      keepAwake: false,
    };

    const mockVoices = [
      { voiceURI: 'pl-voice-1', name: 'Zosia PL', lang: 'pl-PL', default: true } as SpeechSynthesisVoice,
      { voiceURI: 'pl-voice-2', name: 'Krzysztof PL', lang: 'pl-PL', default: false } as SpeechSynthesisVoice,
    ];

    it('renders modal with settings options when open', () => {
      render(
        <ClockSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          settings={mockSettings}
          onUpdateSettings={vi.fn()}
          availableVoices={mockVoices}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Ustawienia/i)).toBeInTheDocument();
      expect(screen.getByText(/Styl ogłaszania/i)).toBeInTheDocument();
      expect(screen.getByText(/Sygnał gongu/i)).toBeInTheDocument();
      expect(screen.getByText(/Synchronizacja do pełnych minut/i)).toBeInTheDocument();
    });

    it('customizes Time Timer settings (enabled, color, showNumbers, direction)', () => {
      const onUpdate = vi.fn();
      render(
        <ClockSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          settings={mockSettings}
          onUpdateSettings={onUpdate}
          availableVoices={mockVoices}
        />
      );

      // 1. Toggle Time Timer switch
      const timeTimerSwitch = screen.getByRole('switch', { name: /Wizualny Time Timer/i });
      expect(timeTimerSwitch).toBeInTheDocument();
      fireEvent.click(timeTimerSwitch);
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeTimer: expect.objectContaining({ enabled: false }),
        })
      );

      // 2. Select Amber color pill
      const amberButton = screen.getByRole('button', { name: /Bursztyn/i });
      fireEvent.click(amberButton);
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeTimer: expect.objectContaining({ color: 'amber' }),
        })
      );

      // 3. Toggle show numbers
      const showNumbersSwitch = screen.getByLabelText(/Pokaż cyfry na tarczy/i);
      fireEvent.click(showNumbersSwitch);
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeTimer: expect.objectContaining({ showNumbers: false }),
        })
      );

      // 4. Change direction to clockwise
      const clockwiseRadio = screen.getByLabelText(/Zgodnie ze wskazówkami/i);
      fireEvent.click(clockwiseRadio);
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeTimer: expect.objectContaining({ direction: 'clockwise' }),
        })
      );
    });

    it('updates format style when option is changed', () => {
      const onUpdate = vi.fn();
      render(
        <ClockSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          settings={mockSettings}
          onUpdateSettings={onUpdate}
          availableVoices={mockVoices}
        />
      );

      const preciseOption = screen.getByLabelText(/Precyzyjny/i);
      fireEvent.click(preciseOption);

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ formatStyle: 'precise' })
      );
    });

    it('updates chime tone and toggles chime', () => {
      const onUpdate = vi.fn();
      render(
        <ClockSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          settings={mockSettings}
          onUpdateSettings={onUpdate}
          availableVoices={mockVoices}
        />
      );

      const chimeToggle = screen.getByRole('switch', { name: /Sygnał gongu/i });
      fireEvent.click(chimeToggle);
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ playChimeBefore: false })
      );
    });

    it('closes modal when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <ClockSettingsModal
          isOpen={true}
          onClose={onClose}
          settings={mockSettings}
          onUpdateSettings={vi.fn()}
          availableVoices={mockVoices}
        />
      );

      const closeBtn = screen.getByRole('button', { name: /^gotowe$/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('useSpeakingClock Hook', () => {
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

      expect(speechService.speakText).toHaveBeenCalled();
    });
  });

  describe('SpeakingClockModule Integration', () => {
    it('renders complete Kotwica Czasu module with header, mode tabs, Time Timer disc, and controls', async () => {
      await act(async () => {
        render(<SpeakingClockModule />);
      });

      expect(screen.getByText('Kotwica Czasu')).toBeInTheDocument();
      expect(screen.getByRole('tablist', { name: /Wybór trybu zegara/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument(); // Time Timer disc
    });

    it('switches between Continuous, Focus, and Departure modes via ModeTabs', async () => {
      await act(async () => {
        render(<SpeakingClockModule />);
      });

      // 1. Switch to Focus mode
      const focusTab = screen.getByRole('tab', { name: /Sesja Focus/i });
      act(() => {
        fireEvent.click(focusTab);
      });
      expect(focusTab).toHaveAttribute('aria-selected', 'true');

      // 2. Switch to Departure mode
      const departureTab = screen.getByRole('tab', { name: /Do Godziny/i });
      act(() => {
        fireEvent.click(departureTab);
      });
      expect(departureTab).toHaveAttribute('aria-selected', 'true');

      // Departure configuration card should now be visible
      expect(screen.getByLabelText(/Godzina docelowa/i)).toBeInTheDocument();
      expect(screen.getByText(/Etykieta Celu/i)).toBeInTheDocument();
    });

    it('configures departure target time and activity label', async () => {
      await act(async () => {
        render(<SpeakingClockModule />);
      });

      // Switch to departure mode
      const departureTab = screen.getByRole('tab', { name: /Do Godziny/i });
      act(() => {
        fireEvent.click(departureTab);
      });

      // Select preset label "Spotkanie"
      const meetingPill = screen.getByRole('button', { name: /^Spotkanie$/i });
      act(() => {
        fireEvent.click(meetingPill);
      });
      expect(meetingPill).toHaveAttribute('aria-pressed', 'true');

      // Change time input
      const timeInput = screen.getByLabelText(/Godzina docelowa/i);
      fireEvent.change(timeInput, { target: { value: '18:45' } });
      expect(timeInput).toHaveValue('18:45');
    });

    it('starts and stops departure countdown with QuickTimeAdjusters active when running', async () => {
      await act(async () => {
        render(<SpeakingClockModule />);
      });

      // Switch to departure mode
      const departureTab = screen.getByRole('tab', { name: /Do Godziny/i });
      act(() => {
        fireEvent.click(departureTab);
      });

      // Start countdown
      const startBtn = screen.getByRole('button', { name: /start/i });
      await act(async () => {
        fireEvent.click(startBtn);
      });

      expect(screen.getByText(/działa w tle/i)).toBeInTheDocument();

      // Quick time adjusters should be visible when running in departure mode
      const add5Btn = screen.getByRole('button', { name: /Dodaj 5 minut/i });
      expect(add5Btn).toBeInTheDocument();

      act(() => {
        fireEvent.click(add5Btn);
      });

      // Stop countdown
      const stopBtn = screen.getByRole('button', { name: /stop/i });
      act(() => {
        fireEvent.click(stopBtn);
      });

      expect(screen.getByText(/gotowy|zatrzymany/i)).toBeInTheDocument();
    });

    it('renders digital ClockDisplay and TimeProgressRing when Time Timer is disabled', async () => {
      localStorage.setItem(
        'ann_speaking_clock_settings',
        JSON.stringify({
          ...DEFAULT_SPEAKING_CLOCK_SETTINGS,
          timeTimer: {
            ...DEFAULT_SPEAKING_CLOCK_SETTINGS.timeTimer,
            enabled: false,
          },
        })
      );

      await act(async () => {
        render(<SpeakingClockModule />);
      });

      // With visual Time Timer disabled, TimeTimerDisc progressbar should not render, but ClockDisplay & TimeProgressRing should
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText(/Zegar w spoczynku/i)).toBeInTheDocument();
    });

    it('opens and closes settings modal in module', async () => {
      await act(async () => {
        render(<SpeakingClockModule />);
      });

      const settingsBtn = screen.getAllByRole('button', { name: /ustawienia/i })[0];
      act(() => {
        fireEvent.click(settingsBtn);
      });

      const closeBtn = screen.getByRole('button', { name: /^gotowe$/i });
      act(() => {
        fireEvent.click(closeBtn);
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('is registered in tool registry with component', () => {
      const tool = getToolById('speaking-clock');
      expect(tool).toBeDefined();
      expect(tool?.component).toBe(SpeakingClockModule);
    });
  });
});
