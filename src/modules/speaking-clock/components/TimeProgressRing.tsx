/**
 * TimeProgressRing Component
 *
 * Visual countdown ring representing the time remaining until the next voice announcement.
 * Designed to provide a grounding sensory visual anchor against ADHD time-blindness.
 */

import React from 'react';
import { type ClockState, type ClockMode } from '../types';
import { Volume2, Sparkles } from 'lucide-react';

export interface TimeProgressRingProps {
  secondsUntilNext: number;
  nextAnnouncementTime: Date | null;
  progress: number;
  clockState: ClockState;
  mode?: ClockMode;
  focusRemainingSeconds?: number;
  lastAnnouncementText?: string | null;
  className?: string;
}

export const TimeProgressRing: React.FC<TimeProgressRingProps> = ({
  secondsUntilNext,
  nextAnnouncementTime,
  progress,
  clockState,
  mode = 'continuous',
  focusRemainingSeconds,
  lastAnnouncementText,
  className = '',
}) => {
  const radius = 78;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const formatMMSS = (totalSec: number): string => {
    const m = Math.floor(Math.max(0, totalSec) / 60);
    const s = Math.max(0, totalSec) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formattedTargetTime = nextAnnouncementTime
    ? `${String(nextAnnouncementTime.getHours()).padStart(2, '0')}:${String(
        nextAnnouncementTime.getMinutes()
      ).padStart(2, '0')}`
    : '';

  const isRunningOrPaused = clockState === 'running' || clockState === 'paused';

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 rounded-3xl bg-white/70 dark:bg-warmgray-850/60 backdrop-blur-sm border border-warmgray-200/70 dark:border-warmgray-800 shadow-sm ${className}`}
    >
      <div className="relative flex items-center justify-center w-52 h-52 sm:w-56 sm:h-56">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 180 180">
          {/* Background circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            className="stroke-warmgray-200/80 dark:stroke-warmgray-800 fill-none"
            strokeWidth={strokeWidth}
          />
          {/* Progress fill */}
          {isRunningOrPaused && (
            <circle
              cx="90"
              cy="90"
              r={radius}
              className="stroke-sage-500 dark:stroke-sage-400 fill-none transition-all duration-500 ease-out"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          {isRunningOrPaused ? (
            <>
              <span className="text-xs uppercase tracking-wider font-semibold text-warmgray-500 dark:text-warmgray-400">
                Kolejne ogłoszenie za
              </span>
              <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-sage-900 dark:text-sage-100 tabular-nums my-1">
                {formatMMSS(secondsUntilNext)}
              </span>
              {formattedTargetTime && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-sage-100 dark:bg-sage-900/60 text-sage-700 dark:text-sage-300 border border-sage-200 dark:border-sage-800">
                  o {formattedTargetTime}
                </span>
              )}
              {mode === 'focus' && focusRemainingSeconds !== undefined && (
                <span className="text-[11px] text-warmgray-500 dark:text-warmgray-400 mt-1">
                  Sesja focus: {formatMMSS(focusRemainingSeconds)}
                </span>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-warmgray-500 dark:text-warmgray-400">
              <div className="w-10 h-10 rounded-full bg-sage-100 dark:bg-sage-900/50 flex items-center justify-center text-sage-600 dark:text-sage-300 mb-2">
                <Volume2 className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-warmgray-700 dark:text-warmgray-300">
                Zegar w spoczynku
              </span>
              <span className="text-xs text-warmgray-500 dark:text-warmgray-400 mt-0.5">
                Naciśnij Start
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Last Announcement Pill */}
      {lastAnnouncementText && (
        <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sage-50 dark:bg-sage-950/40 border border-sage-200/60 dark:border-sage-900/60 text-xs text-sage-800 dark:text-sage-200 max-w-xs text-center animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-sage-500 shrink-0" />
          <span className="truncate">
            Ostatnio: <span className="italic font-medium">„{lastAnnouncementText}”</span>
          </span>
        </div>
      )}
    </div>
  );
};
export default TimeProgressRing;
