/**
 * DepartureConfig Component
 *
 * Sensory-friendly configuration card for Departure Countdown mode (Do Godziny):
 * - Large digital time picker with quick relative relative presets (+15m, +30m, +45m, +1h)
 * - Ergonomic activity preset tags (Wyjście z domu, Spotkanie, Pociąg...) + custom label input
 * - Smart density toggle with soothing explanatory text
 */

import React, { useRef } from 'react';
import { Clock, Tag, Sparkles, Plus } from 'lucide-react';
import { DepartureSettings } from '../types';

export interface DepartureConfigProps {
  settings: DepartureSettings;
  onChange: (settings: Partial<DepartureSettings>) => void;
  disabled?: boolean;
  className?: string;
}

const PRESET_LABELS = [
  'Wyjście z domu',
  'Spotkanie',
  'Pociąg / Autobus',
  'Leki',
  'Gotowanie',
  'Przerwa',
];

const RELATIVE_OFFSETS = [
  { label: '+15 min', minutes: 15 },
  { label: '+30 min', minutes: 30 },
  { label: '+45 min', minutes: 45 },
  { label: '+1 godz.', minutes: 60 },
];

export const DepartureConfig: React.FC<DepartureConfigProps> = ({
  settings,
  onChange,
  disabled = false,
  className = '',
}) => {
  const customInputRef = useRef<HTMLInputElement>(null);

  const handleRelativeTime = (offsetMinutes: number) => {
    const now = new Date();
    const future = new Date(now.getTime() + offsetMinutes * 60 * 1000);
    const hours = String(future.getHours()).padStart(2, '0');
    const mins = String(future.getMinutes()).padStart(2, '0');
    onChange({ targetTime: `${hours}:${mins}` });
  };

  const handleSelectPreset = (preset: string) => {
    onChange({ label: preset });
  };

  const handleCustomClick = () => {
    if (customInputRef.current) {
      customInputRef.current.focus();
    }
  };

  const isPresetActive = (preset: string) => settings.label === preset;
  const isCustomActive = !PRESET_LABELS.includes(settings.label);

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-warmgray-850/70 backdrop-blur-sm border border-warmgray-200/80 dark:border-warmgray-800 shadow-sm space-y-5 ${className}`}
    >
      {/* 1. Time Picker & Quick Relative Steppers */}
      <div className="space-y-2.5">
        <label
          htmlFor="departure-target-time"
          className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Godzina Docelowa</span>
        </label>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Main Big Time Input */}
          <div className="relative flex-1">
            <input
              id="departure-target-time"
              type="time"
              aria-label="Godzina docelowa"
              value={settings.targetTime}
              disabled={disabled}
              onChange={(e) => onChange({ targetTime: e.target.value })}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-300/80 dark:border-warmgray-700 font-mono text-2xl font-bold text-warmgray-900 dark:text-warmgray-100 tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-sage-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          {/* Quick Relative Buttons */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
            role="group"
            aria-label="Szybkie ustawienie godziny"
          >
            {RELATIVE_OFFSETS.map((offset) => (
              <button
                key={offset.label}
                type="button"
                disabled={disabled}
                onClick={() => handleRelativeTime(offset.minutes)}
                className="flex-1 sm:flex-none min-h-[48px] px-3 py-2 rounded-2xl bg-warmgray-100/90 dark:bg-warmgray-800 hover:bg-sage-50 dark:hover:bg-warmgray-750 text-warmgray-800 dark:text-warmgray-200 border border-warmgray-200/80 dark:border-warmgray-700 text-xs sm:text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {offset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Tag Presets & Custom Label Input */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          <span>Etykieta Celu / Wyjścia</span>
        </label>

        {/* Preset Pills */}
        <div
          className="flex flex-wrap items-center gap-1.5 sm:gap-2"
          role="group"
          aria-label="Gotowe etykiety celu"
        >
          {PRESET_LABELS.map((preset) => {
            const active = isPresetActive(preset);
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => handleSelectPreset(preset)}
                className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 select-none ${
                  active
                    ? 'bg-sage-600 dark:bg-sage-500 text-white shadow-sm ring-1 ring-sage-400/50 scale-[1.02]'
                    : 'bg-warmgray-50 dark:bg-warmgray-800/80 text-warmgray-700 dark:text-warmgray-300 hover:bg-sage-50 dark:hover:bg-warmgray-750 border border-warmgray-200/80 dark:border-warmgray-700'
                } ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed pointer-events-none'
                    : 'cursor-pointer active:scale-95'
                }`}
              >
                {preset}
              </button>
            );
          })}

          {/* Własna... Button */}
          <button
            type="button"
            aria-pressed={isCustomActive}
            disabled={disabled}
            onClick={handleCustomClick}
            className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 select-none flex items-center gap-1 ${
              isCustomActive
                ? 'bg-sage-600 dark:bg-sage-500 text-white shadow-sm ring-1 ring-sage-400/50'
                : 'bg-warmgray-50 dark:bg-warmgray-800/80 text-warmgray-700 dark:text-warmgray-300 hover:bg-sage-50 dark:hover:bg-warmgray-750 border border-dashed border-warmgray-300 dark:border-warmgray-600'
            } ${
              disabled
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : 'cursor-pointer active:scale-95'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Własna...</span>
          </button>
        </div>

        {/* Custom text input */}
        <div className="pt-1">
          <input
            ref={customInputRef}
            type="text"
            aria-label="Nazwa celu lub wyjścia"
            placeholder="Wpisz własny cel (np. Wizyta u dentysty)..."
            value={settings.label}
            disabled={disabled}
            onChange={(e) => onChange({ label: e.target.value })}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-200/90 dark:border-warmgray-750 text-sm text-warmgray-800 dark:text-warmgray-100 placeholder-warmgray-400 dark:placeholder-warmgray-500 focus:outline-none focus:ring-2 focus:ring-sage-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
        </div>
      </div>

      {/* 3. Announcement Frequency / Cadence Selection */}
      <div className="pt-1 border-t border-warmgray-200/60 dark:border-warmgray-800 space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sage-600 dark:text-sage-400" />
          <span>Częstotliwość Ogłoszeń</span>
        </label>

        <div
          className="flex flex-wrap items-center gap-1.5 sm:gap-2"
          role="group"
          aria-label="Wybór częstotliwości ogłoszeń do wyjścia"
        >
          {/* Smart Density Pill */}
          <button
            type="button"
            aria-pressed={settings.smartDensity}
            disabled={disabled}
            onClick={() => onChange({ smartDensity: true })}
            className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 select-none flex items-center gap-1.5 ${
              settings.smartDensity
                ? 'bg-sage-600 dark:bg-sage-500 text-white shadow-sm ring-1 ring-sage-400/50 scale-[1.02]'
                : 'bg-warmgray-50 dark:bg-warmgray-800/80 text-warmgray-700 dark:text-warmgray-300 hover:bg-sage-50 dark:hover:bg-warmgray-750 border border-warmgray-200/80 dark:border-warmgray-700'
            } ${
              disabled
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : 'cursor-pointer active:scale-95'
            }`}
          >
            <span>⚡ Smart (Zagęszczanie)</span>
          </button>

          {/* Fixed Interval Pills: 1m, 2m, 3m, 5m, 10m, 15m */}
          {[1, 2, 3, 5, 10, 15].map((mins) => {
            const active = !settings.smartDensity && (settings.intervalMinutes ?? 2) === mins;
            return (
              <button
                key={mins}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onChange({ smartDensity: false, intervalMinutes: mins })}
                className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 select-none ${
                  active
                    ? 'bg-sage-600 dark:bg-sage-500 text-white shadow-sm ring-1 ring-sage-400/50 scale-[1.02]'
                    : 'bg-warmgray-50 dark:bg-warmgray-800/80 text-warmgray-700 dark:text-warmgray-300 hover:bg-sage-50 dark:hover:bg-warmgray-750 border border-warmgray-200/80 dark:border-warmgray-700'
                } ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed pointer-events-none'
                    : 'cursor-pointer active:scale-95'
                }`}
              >
                Co {mins} min
              </button>
            );
          })}
        </div>

        <p className="text-[11px] sm:text-xs text-warmgray-500 dark:text-warmgray-400 font-normal leading-relaxed pt-0.5">
          {settings.smartDensity
            ? 'Ogłasza czas częściej w miarę zbliżania się do godziny wyjścia (np. co 15 min, potem co 5, 2 i 1 min).'
            : `Głos lektora będzie ogłaszać pozostały czas regularnie co ${settings.intervalMinutes || 2} min aż do wyjścia.`}
        </p>
      </div>
    </div>
  );
};

export default DepartureConfig;
