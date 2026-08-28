/**
 * ClockSettingsModal Component
 *
 * Sensory-friendly configuration modal for the Speaking Clock:
 * - Polish TTS Voice & speed/pitch controls
 * - Announcement style (Natural / Precise / Short / Elapsed)
 * - Harmonic chime toggle, tone selection, and volume preview
 * - Wall-clock interval alignment (:00, :15, :30)
 * - Clock mode (Continuous vs Focus Pomodoro)
 * - Screen WakeLock toggle
 */

import React, { useEffect, useCallback } from 'react';
import { X, Volume2, Music, Clock, Bell, Sparkles, Check } from '../../../lib/icons';
import {
  type SpeakingClockSettings,
  type TimeFormatStyle,
  type ChimeTone,
  type TimeTimerColor,
} from '../types';
import { playChime } from '../services/chimeSynthesizer';

export interface ClockSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SpeakingClockSettings;
  onUpdateSettings: (settings: Partial<SpeakingClockSettings>) => void;
  availableVoices: SpeechSynthesisVoice[];
  onTestVoice?: () => void | Promise<void>;
}

export const ClockSettingsModal: React.FC<ClockSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  availableVoices,
  onTestVoice,
}) => {
  // Close on Escape key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleTestChime = () => {
    playChime({
      tone: settings.chimeTone,
      volume: settings.chimeVolume,
    }).catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-warmgray-950/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clock-settings-title"
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-warmgray-50 dark:bg-warmgray-900 rounded-3xl shadow-xl border border-warmgray-200 dark:border-warmgray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warmgray-200/80 dark:border-warmgray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sage-100 dark:bg-sage-900/60 flex items-center justify-center text-sage-600 dark:text-sage-300">
              <Clock className="w-4 h-4" />
            </div>
            <h2
              id="clock-settings-title"
              className="text-lg font-semibold text-warmgray-900 dark:text-warmgray-100"
            >
              Ustawienia Kotwicy Czasu
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij ustawienia"
            className="p-2 rounded-xl text-warmgray-500 hover:text-warmgray-700 dark:text-warmgray-400 dark:hover:text-warmgray-200 hover:bg-warmgray-200/60 dark:hover:bg-warmgray-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
          {/* Section 1: Wizualny Time Timer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="time-timer-toggle"
                className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Wizualny Time Timer</span>
              </label>

              <button
                id="time-timer-toggle"
                type="button"
                role="switch"
                aria-label="Wizualny Time Timer"
                aria-checked={settings.timeTimer?.enabled ?? true}
                onClick={() =>
                  onUpdateSettings({
                    timeTimer: {
                      ...settings.timeTimer,
                      enabled: !(settings.timeTimer?.enabled ?? true),
                    },
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent ${
                  (settings.timeTimer?.enabled ?? true)
                    ? 'bg-sage-600'
                    : 'bg-warmgray-300 dark:bg-warmgray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    (settings.timeTimer?.enabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {(settings.timeTimer?.enabled ?? true) && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 space-y-3.5">
                {/* Kolor tarczy Time Timer */}
                <div>
                  <span className="block text-xs font-medium text-warmgray-600 dark:text-warmgray-400 mb-1.5">
                    Kolor tarczy zegara
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        { id: 'sage', label: 'Szałwia', color: '#5B8272' },
                        { id: 'amber', label: 'Bursztyn', color: '#F59E0B' },
                        { id: 'lavender', label: 'Lawenda', color: '#8B5CF6' },
                        { id: 'rose', label: 'Koral', color: '#F43F5E' },
                        { id: 'ocean', label: 'Ocean', color: '#0EA5E9' },
                      ] as const satisfies readonly { id: TimeTimerColor; label: string; color: string }[]
                    ).map((palette) => {
                      const isActive = (settings.timeTimer?.color || 'sage') === palette.id;
                      return (
                        <button
                          key={palette.id}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              timeTimer: {
                                ...settings.timeTimer,
                                color: palette.id,
                              },
                            })
                          }
                          className={`min-h-[40px] py-1.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                            isActive
                              ? 'bg-warmgray-100 dark:bg-warmgray-800 border-sage-500 font-semibold ring-1 ring-sage-500 text-warmgray-900 dark:text-warmgray-100'
                              : 'bg-warmgray-50 dark:bg-warmgray-800/60 border-warmgray-200 dark:border-warmgray-700 text-warmgray-700 dark:text-warmgray-300 hover:bg-warmgray-100'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: palette.color }}
                          />
                          <span>{palette.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Opcja cyfr na tarczy */}
                <label className="flex items-center justify-between pt-1 border-t border-warmgray-100 dark:border-warmgray-800 cursor-pointer">
                  <div>
                    <span className="font-medium text-xs text-warmgray-800 dark:text-warmgray-200">
                      Pokaż cyfry na tarczy
                    </span>
                    <p className="text-[11px] text-warmgray-500 dark:text-warmgray-400 mt-0.5">
                      Wyświetla oznaczenia 0, 5, 10... 55 min wokół tarczy
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Pokaż cyfry na tarczy"
                    checked={settings.timeTimer?.showNumbers ?? true}
                    onChange={(e) =>
                      onUpdateSettings({
                        timeTimer: {
                          ...settings.timeTimer,
                          showNumbers: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded text-sage-600 accent-sage-600"
                  />
                </label>

                {/* Kierunek odliczania */}
                <div className="pt-1 border-t border-warmgray-100 dark:border-warmgray-800 space-y-1.5">
                  <span className="block text-xs font-medium text-warmgray-600 dark:text-warmgray-400">
                    Kierunek tarczy
                  </span>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-warmgray-700 dark:text-warmgray-300">
                      <input
                        type="radio"
                        name="ttDirection"
                        value="counter-clockwise"
                        checked={
                          (settings.timeTimer?.direction ?? 'counter-clockwise') ===
                          'counter-clockwise'
                        }
                        onChange={() =>
                          onUpdateSettings({
                            timeTimer: {
                              ...settings.timeTimer,
                              direction: 'counter-clockwise',
                            },
                          })
                        }
                        className="accent-sage-600"
                      />
                      <span>Przeciwnie do wskazówek zegara (Time Timer)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-warmgray-700 dark:text-warmgray-300">
                      <input
                        type="radio"
                        name="ttDirection"
                        value="clockwise"
                        checked={settings.timeTimer?.direction === 'clockwise'}
                        onChange={() =>
                          onUpdateSettings({
                            timeTimer: {
                              ...settings.timeTimer,
                              direction: 'clockwise',
                            },
                          })
                        }
                        className="accent-sage-600"
                      />
                      <span>Zgodnie ze wskazówkami</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Tryb Pracy (Mode) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Tryb Pracy</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ mode: 'continuous' })}
                className={`py-2.5 px-3 rounded-2xl border text-left font-medium transition-all ${
                  settings.mode === 'continuous'
                    ? 'bg-sage-100 dark:bg-sage-900/50 border-sage-500 text-sage-900 dark:text-sage-100 ring-1 ring-sage-500'
                    : 'bg-white dark:bg-warmgray-850 border-warmgray-200 dark:border-warmgray-750 text-warmgray-700 dark:text-warmgray-300 hover:bg-warmgray-100 dark:hover:bg-warmgray-800'
                }`}
              >
                <div className="font-semibold text-sm">Ciągły Zegar</div>
                <div className="text-xs text-warmgray-500 dark:text-warmgray-400 font-normal mt-0.5">
                  Ogłoszenia co interwał
                </div>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ mode: 'focus' })}
                className={`py-2.5 px-3 rounded-2xl border text-left font-medium transition-all ${
                  settings.mode === 'focus'
                    ? 'bg-sage-100 dark:bg-sage-900/50 border-sage-500 text-sage-900 dark:text-sage-100 ring-1 ring-sage-500'
                    : 'bg-white dark:bg-warmgray-850 border-warmgray-200 dark:border-warmgray-750 text-warmgray-700 dark:text-warmgray-300 hover:bg-warmgray-100 dark:hover:bg-warmgray-800'
                }`}
              >
                <div className="font-semibold text-sm">Sesja Focus</div>
                <div className="text-xs text-warmgray-500 dark:text-warmgray-400 font-normal mt-0.5">
                  Limitowana sesja skupienia
                </div>
              </button>
            </div>

            {settings.mode === 'focus' && (
              <div className="p-3 rounded-2xl bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-warmgray-600 dark:text-warmgray-400">
                    Czas trwania sesji focus:
                  </span>
                  <span className="font-semibold text-warmgray-800 dark:text-warmgray-200">
                    {settings.focusDurationMinutes} min
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={90}
                  step={5}
                  value={settings.focusDurationMinutes}
                  onChange={(e) =>
                    onUpdateSettings({ focusDurationMinutes: Number(e.target.value) })
                  }
                  className="w-full accent-sage-600"
                />
              </div>
            )}
          </div>

          {/* Section 3: Styl ogłaszania (Time format style) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Styl ogłaszania godziny</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'natural', title: 'Naturalny', desc: 'np. Za piętnaście druga' },
                { id: 'precise', title: 'Precyzyjny', desc: 'np. Trzynasta czterdzieści pięć' },
                { id: 'short', title: 'Krótki', desc: 'np. Pierwsza czterdzieści pięć' },
                { id: 'elapsed', title: 'Upływ Czasu', desc: 'np. Minęło 45 minut sesji' },
              ].map((style) => (
                <label
                  key={style.id}
                  className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                    settings.formatStyle === style.id
                      ? 'bg-sage-100 dark:bg-sage-900/50 border-sage-500 text-sage-900 dark:text-sage-100 ring-1 ring-sage-500'
                      : 'bg-white dark:bg-warmgray-850 border-warmgray-200 dark:border-warmgray-750 text-warmgray-700 dark:text-warmgray-300 hover:bg-warmgray-100 dark:hover:bg-warmgray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="formatStyle"
                    value={style.id}
                    checked={settings.formatStyle === style.id}
                    onChange={() => onUpdateSettings({ formatStyle: style.id as TimeFormatStyle })}
                    className="mt-1 accent-sage-600"
                  />
                  <div>
                    <div className="font-semibold text-xs">{style.title}</div>
                    <div className="text-[11px] text-warmgray-500 dark:text-warmgray-400 font-normal">
                      {style.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Głos lektora (TTS Voice & Pitch/Rate) */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Głos lektora (TTS)</span>
            </label>

            <div>
              <label
                htmlFor="voice-select"
                className="block text-xs font-medium text-warmgray-600 dark:text-warmgray-400 mb-1"
              >
                Wybór głosu
              </label>
              <select
                id="voice-select"
                value={settings.voiceURI || ''}
                onChange={(e) => onUpdateSettings({ voiceURI: e.target.value || undefined })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 text-warmgray-800 dark:text-warmgray-200 focus:outline-none focus:ring-2 focus:ring-sage-500"
              >
                <option value="">Domyślny głos polski</option>
                {availableVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang}) {voice.default ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-warmgray-600 dark:text-warmgray-400">Tempo mowy</span>
                  <span className="font-semibold text-warmgray-800 dark:text-warmgray-200">
                    {(settings.speechRate ?? settings.rate ?? 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.4}
                  step={0.05}
                  value={settings.speechRate ?? settings.rate ?? 1.0}
                  onChange={(e) => onUpdateSettings({ speechRate: Number(e.target.value), rate: Number(e.target.value) })}
                  className="w-full accent-sage-600"
                />
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-warmgray-600 dark:text-warmgray-400">Wysokość tonu</span>
                  <span className="font-semibold text-warmgray-800 dark:text-warmgray-200">
                    {(settings.speechPitch ?? settings.pitch ?? 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.2}
                  step={0.05}
                  value={settings.speechPitch ?? settings.pitch ?? 1.0}
                  onChange={(e) => onUpdateSettings({ speechPitch: Number(e.target.value), pitch: Number(e.target.value) })}
                  className="w-full accent-sage-600"
                />
              </div>
            </div>

            {onTestVoice && (
              <button
                type="button"
                onClick={() => onTestVoice()}
                className="w-full py-2 px-3 rounded-xl border border-warmgray-200 dark:border-warmgray-750 bg-warmgray-50 dark:bg-warmgray-800 text-warmgray-700 dark:text-warmgray-300 hover:bg-warmgray-100 dark:hover:bg-warmgray-750 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Przetestuj wybrany głos i tempo</span>
              </button>
            )}
          </div>

          {/* Section 4: Sygnał gongu (Chime) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="chime-toggle"
                className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Sygnał gongu</span>
              </label>

              <button
                id="chime-toggle"
                type="button"
                role="switch"
                aria-label="Sygnał gongu przed mową"
                aria-checked={settings.playChimeBefore}
                onClick={() => onUpdateSettings({ playChimeBefore: !settings.playChimeBefore })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent ${
                  settings.playChimeBefore ? 'bg-sage-600' : 'bg-warmgray-300 dark:bg-warmgray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.playChimeBefore ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.playChimeBefore && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 space-y-3">
                <div>
                  <span className="block text-xs font-medium text-warmgray-600 dark:text-warmgray-400 mb-1.5">
                    Barwa dźwięku gongu
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gentle', label: 'Łagodny' },
                      { id: 'warm', label: 'Ciepły' },
                      { id: 'bright', label: 'Jasny' },
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => onUpdateSettings({ chimeTone: tone.id as ChimeTone })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          settings.chimeTone === tone.id
                            ? 'bg-sage-100 dark:bg-sage-900/60 border-sage-500 text-sage-900 dark:text-sage-100 font-semibold'
                            : 'bg-warmgray-50 dark:bg-warmgray-800 border-warmgray-200 dark:border-warmgray-700 text-warmgray-700 dark:text-warmgray-300'
                        }`}
                      >
                        {tone.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-warmgray-600 dark:text-warmgray-400">Głośność gongu</span>
                    <span className="font-semibold text-warmgray-800 dark:text-warmgray-200">
                      {Math.round(settings.chimeVolume * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={settings.chimeVolume}
                      onChange={(e) => onUpdateSettings({ chimeVolume: Number(e.target.value) })}
                      className="flex-1 accent-sage-600"
                    />
                    <button
                      type="button"
                      onClick={handleTestChime}
                      className="px-2.5 py-1 rounded-xl bg-sage-50 dark:bg-sage-950/60 hover:bg-sage-100 dark:hover:bg-sage-900/60 border border-sage-200 dark:border-sage-800 text-sage-800 dark:text-sage-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Music className="w-3 h-3 text-sage-600 dark:text-sage-400" />
                      <span>Test</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Synchronizacja zegara i WakeLock */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Opcje Zegara i Działania w Tle</span>
            </label>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 cursor-pointer">
                <div>
                  <span className="font-medium text-xs text-warmgray-800 dark:text-warmgray-200">
                    Synchronizacja do pełnych minut
                  </span>
                  <p className="text-[11px] text-warmgray-500 dark:text-warmgray-400 mt-0.5">
                    Wyrównaj ogłoszenia do pełnych minut zegara (:00, :15, :30...)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.clockSync}
                  onChange={(e) => onUpdateSettings({ clockSync: e.target.checked })}
                  className="w-4 h-4 rounded text-sage-600 accent-sage-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 cursor-pointer">
                <div>
                  <span className="font-medium text-xs text-warmgray-800 dark:text-warmgray-200">
                    Nie wygaszaj ekranu (Wake Lock)
                  </span>
                  <p className="text-[11px] text-warmgray-500 dark:text-warmgray-400 mt-0.5">
                    Zapobiega uśpieniu ekranu podczas aktywnego zegara
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.wakeLockEnabled}
                  onChange={(e) => onUpdateSettings({ wakeLockEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-sage-600 accent-sage-600"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-warmgray-200/80 dark:border-warmgray-800 flex justify-end shrink-0 bg-white/50 dark:bg-warmgray-850/50">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-sage-600 hover:bg-sage-700 active:scale-95 text-white font-medium text-sm shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Gotowe</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ClockSettingsModal;
