import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface MultiPhaseProgressDiscProps {
  progress: number; // 0 to 100
  phase: 'focus' | 'short-break' | 'long-break';
  timeLeft: string;
  totalDuration: string;
  isActive: boolean;
  onToggle: () => void;
}

export const MultiPhaseProgressDisc: React.FC<MultiPhaseProgressDiscProps> = ({
  progress,
  phase,
  timeLeft,
  totalDuration,
  isActive,
  onToggle,
}) => {
  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const phaseColors = {
    'focus': 'text-sage-500',
    'short-break': 'text-blue-500',
    'long-break': 'text-purple-500',
  };

  return (
    <button
      onClick={onToggle}
      className="relative flex items-center justify-center w-full max-w-[300px] aspect-square mx-auto rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-sage-500 group"
      aria-label={isActive ? 'Pause timer' : 'Start timer'}
    >
      {/* Background track */}
      <svg
        height={radius * 2}
        width={radius * 2}
        className="absolute inset-0 w-full h-full transform -rotate-90"
      >
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-warmgray-100 dark:text-warmgray-800 transition-colors"
        />
        {/* Progress track */}
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={twMerge(
            clsx(
              'transition-all duration-1000 ease-linear',
              phaseColors[phase]
            )
          )}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Inner content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-sm font-medium text-warmgray-500 dark:text-warmgray-400 capitalize mb-1">
          {phase.replace('-', ' ')}
        </span>
        <span className="text-5xl sm:text-6xl font-bold text-warmgray-900 dark:text-white tabular-nums tracking-tight">
          {timeLeft}
        </span>
        <span className="text-sm text-warmgray-400 dark:text-warmgray-500 mt-1">
          of {totalDuration}
        </span>
      </div>
      
      {/* Hover overlay for play/pause */}
      <div className={clsx(
        "absolute inset-4 rounded-full bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none",
        isActive ? "" : "backdrop-blur-[1px]"
      )}>
        <span className="bg-white/90 dark:bg-warmgray-800/90 text-warmgray-900 dark:text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm">
          {isActive ? 'Pause' : 'Start'}
        </span>
      </div>
    </button>
  );
};
