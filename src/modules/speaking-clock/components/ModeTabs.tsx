/**
 * ModeTabs Component
 *
 * Sensory-friendly, ergonomic mode selector for the Speaking Clock & Time Anchor:
 * - Continuous Speaking Clock (Zegar Ciągły)
 * - Bounded Focus Session (Sesja Focus)
 * - Departure & Target Deadline Countdown (Do Godziny)
 *
 * Designed with large tap targets (>=48px), clear tactile visual feedback, and full accessibility.
 */

import React from 'react';
import { Clock, Sparkles, Footprints } from '../../../lib/icons';
import { ClockMode } from '../types';

export interface ModeTabsProps {
  activeMode: ClockMode;
  onModeChange: (mode: ClockMode) => void;
  disabled?: boolean;
  className?: string;
}

interface ModeOption {
  id: ClockMode;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: 'continuous',
    title: 'Zegar Ciągły',
    subtitle: 'Co N minut',
    icon: Clock,
  },
  {
    id: 'focus',
    title: 'Sesja Focus',
    subtitle: 'Blok czasu',
    icon: Sparkles,
  },
  {
    id: 'departure',
    title: 'Do Godziny',
    subtitle: 'Wyjście / Cel',
    icon: Footprints,
  },
];

export const ModeTabs: React.FC<ModeTabsProps> = ({
  activeMode,
  onModeChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div
      role="tablist"
      aria-label="Wybór trybu zegara"
      className={`grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 p-1.5 rounded-3xl bg-warmgray-100/90 dark:bg-warmgray-900/90 border border-warmgray-200/80 dark:border-warmgray-800 ${className}`}
    >
      {MODE_OPTIONS.map((mode) => {
        const isActive = activeMode === mode.id;
        const IconComponent = mode.icon;

        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`${mode.title} - ${mode.subtitle}`}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onModeChange(mode.id)}
            className={`min-h-[48px] px-3.5 py-2.5 rounded-2xl flex items-center gap-3 transition-all duration-300 select-none text-left ${
              isActive
                ? 'bg-sage-100 dark:bg-sage-900/60 text-sage-900 dark:text-sage-100 shadow-sm border border-sage-300/60 dark:border-sage-700/60 font-medium scale-[1.02]'
                : 'bg-white/70 dark:bg-warmgray-850/60 text-warmgray-700 dark:text-warmgray-300 hover:bg-white dark:hover:bg-warmgray-800 border border-warmgray-200/60 dark:border-warmgray-750/60'
            } ${
              disabled
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : 'cursor-pointer active:scale-95'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isActive
                  ? 'bg-sage-200 dark:bg-sage-800 text-sage-700 dark:text-sage-300'
                  : 'bg-warmgray-100 dark:bg-warmgray-800 text-sage-600 dark:text-sage-400'
              }`}
            >
              <IconComponent className="w-5 h-5" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate leading-tight">
                {mode.title}
              </span>
              <span
                className={`text-xs truncate leading-normal transition-colors ${
                  isActive
                    ? 'text-sage-700 dark:text-sage-400'
                    : 'text-warmgray-500 dark:text-warmgray-400'
                }`}
              >
                {mode.subtitle}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ModeTabs;
