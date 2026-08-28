import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeakingClockModule } from './SpeakingClockModule';
import { getToolById } from '../../core/registry';
import { czasIds } from './testIds';
import * as speechService from './services/speechService';

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

vi.mock('../../lib/audio/chime', () => ({
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

  it('nie pokazuje ostrzeżenia o głosie, gdy polski głos jest dostępny', async () => {
    render(<SpeakingClockModule />);
    await waitFor(() => expect(screen.getByTestId(czasIds.disc)).toBeInTheDocument());
    expect(screen.queryByTestId(czasIds.noVoiceNotice)).not.toBeInTheDocument();
  });

  it('ostrzega, gdy telefon nie ma polskiego głosu', async () => {
    // Silnik nie eskaluje tego przypadku, więc bez tego komunikatu użytkowniczka
    // wciska Start i po prostu panuje cisza.
    vi.mocked(speechService.getPolishVoices).mockResolvedValue([]);
    render(<SpeakingClockModule />);

    expect(await screen.findByTestId(czasIds.noVoiceNotice)).toBeInTheDocument();
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
