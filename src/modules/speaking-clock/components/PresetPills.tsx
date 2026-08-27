/**
 * PresetPills Component
 *
 * One-tap preset pills for quickly selecting announcement intervals (1, 2, 5, 10, 15, 30, 60 min).
 * Features generous touch targets and distinct active styling for easy ADHD focus switching.
 */

import React from 'react';

export interface PresetPillsProps {
  intervalMinutes: number;
  onSelectInterval: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
}

const PRESET_INTERVALS = [1, 2, 5, 10, 15, 30, 60];

export const PresetPills: React.FC<PresetPillsProps> = ({
  intervalMinutes,
  onSelectInterval,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400">
        Odstęp ogłoszeń
      </span>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Wybór odstępu czasu">
        {PRESET_INTERVALS.map((minutes) => {
          const isActive = intervalMinutes === minutes;
          return (
            <button
              key={minutes}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              onClick={() => onSelectInterval(minutes)}
              className={`min-h-[44px] min-w-[54px] px-3.5 py-2 rounded-2xl text-sm font-medium transition-all duration-150 select-none flex items-center justify-center ${
                isActive
                  ? 'bg-sage-600 dark:bg-sage-500 text-white shadow-sm ring-2 ring-sage-400/50 scale-[1.02]'
                  : 'bg-white dark:bg-warmgray-850 text-warmgray-700 dark:text-warmgray-300 hover:bg-sage-50 dark:hover:bg-warmgray-800 border border-warmgray-200/80 dark:border-warmgray-750 active:scale-95'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {minutes} min
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default PresetPills;
