/**
 * ClockDisplay Component
 *
 * Prominent, soothing digital clock showing current time (HH:MM:SS), formatted Polish date,
 * and visual status indicator (idle / running in background / paused).
 */

import React from 'react';
import { type ClockState } from '../types';

export interface ClockDisplayProps {
  currentTime: Date;
  clockState: ClockState;
  className?: string;
}

export const ClockDisplay: React.FC<ClockDisplayProps> = ({
  currentTime,
  clockState,
  className = '',
}) => {
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  // Polish date formatting (e.g. "Czwartek, 27 sierpnia 2026")
  const rawDate = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(currentTime);

  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-3xl bg-white/70 dark:bg-warmgray-850/60 backdrop-blur-sm border border-warmgray-200/70 dark:border-warmgray-800 shadow-sm ${className}`}
    >
      {/* Status Badge */}
      <div className="mb-3">
        {clockState === 'running' && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Działa w tle
          </span>
        )}
        {clockState === 'paused' && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Wstrzymany
          </span>
        )}
        {clockState === 'idle' && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium bg-warmgray-100 dark:bg-warmgray-800 text-warmgray-600 dark:text-warmgray-400 border border-warmgray-200 dark:border-warmgray-700">
            <span className="w-2 h-2 rounded-full bg-warmgray-400 dark:bg-warmgray-500" />
            Gotowy do startu
          </span>
        )}
      </div>

      {/* Digital Time */}
      <div
        className="font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-sage-900 dark:text-sage-100 tabular-nums select-none"
        aria-label={`Aktualna godzina: ${hours}:${minutes}:${seconds}`}
      >
        <span>{hours}</span>
        <span className="text-sage-400 dark:text-sage-600 mx-0.5">:</span>
        <span>{minutes}</span>
        <span className="text-sage-400 dark:text-sage-600 mx-0.5">:</span>
        <span className="text-sage-500/80 dark:text-sage-400/80 text-3xl sm:text-4xl md:text-5xl font-medium">
          {seconds}
        </span>
      </div>

      {/* Date */}
      <p className="mt-2 text-sm sm:text-base text-warmgray-600 dark:text-warmgray-300 font-normal">
        {formattedDate}
      </p>
    </div>
  );
};
export default ClockDisplay;
