/**
 * QuickTimeAdjusters Component
 *
 * One-tap dynamic time adjuster pills active during running sessions or departure countdowns:
 * - -5 min, +1 min, +5 min, +10 min
 * - Large touch targets (>= 48px), tactile feedback, soothing sensory palette, fully accessible.
 */

import React from 'react';

export interface QuickTimeAdjustersProps {
  onAdjustMinutes: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
}

interface AdjustOption {
  minutes: number;
  label: string;
  ariaLabel: string;
  variant: 'negative' | 'positive';
}

const ADJUST_OPTIONS: AdjustOption[] = [
  {
    minutes: -5,
    label: '-5 min',
    ariaLabel: 'Odejmij 5 minut',
    variant: 'negative',
  },
  {
    minutes: 1,
    label: '+1 min',
    ariaLabel: 'Dodaj 1 minutę',
    variant: 'positive',
  },
  {
    minutes: 5,
    label: '+5 min',
    ariaLabel: 'Dodaj 5 minut',
    variant: 'positive',
  },
  {
    minutes: 10,
    label: '+10 min',
    ariaLabel: 'Dodaj 10 minut',
    variant: 'positive',
  },
];

export const QuickTimeAdjusters: React.FC<QuickTimeAdjustersProps> = ({
  onAdjustMinutes,
  disabled = false,
  className = '',
}) => {
  return (
    <div
      role="group"
      aria-label="Szybka zmiana czasu sesji"
      className={`flex items-center gap-2 flex-wrap ${className}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400 mr-1 hidden sm:inline-block">
        Korekta:
      </span>
      {ADJUST_OPTIONS.map((option) => (
        <button
          key={option.minutes}
          type="button"
          aria-label={option.ariaLabel}
          disabled={disabled}
          onClick={() => onAdjustMinutes(option.minutes)}
          className={`flex-1 sm:flex-none min-h-[48px] min-w-[56px] px-3.5 py-2.5 rounded-2xl font-mono text-sm font-semibold transition-all duration-150 select-none flex items-center justify-center border shadow-xs ${
            option.variant === 'negative'
              ? 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:bg-rose-200 dark:active:bg-rose-800/80'
              : 'bg-sage-50/90 dark:bg-sage-950/40 text-sage-800 dark:text-sage-200 border-sage-200/80 dark:border-sage-800/80 hover:bg-sage-100 dark:hover:bg-sage-900/60 active:bg-sage-200 dark:active:bg-sage-800/80'
          } ${
            disabled
              ? 'opacity-50 cursor-not-allowed pointer-events-none'
              : 'cursor-pointer active:scale-95'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default QuickTimeAdjusters;
