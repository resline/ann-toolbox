import React from 'react';
import { cn } from '../../../lib/cn';

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
  const radius = 130;
  const stroke = 16;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const phaseGradients = {
    'focus': 'url(#focusGradient)',
    'short-break': 'url(#shortBreakGradient)',
    'long-break': 'url(#longBreakGradient)',
  };

  const phaseColors = {
    'focus': 'text-emerald-500',
    'short-break': 'text-cyan-500',
    'long-break': 'text-violet-400',
  };

  return (
    <button
      onClick={onToggle}
      className="relative flex items-center justify-center w-full max-w-[320px] aspect-square mx-auto rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-sage-500 group"
      aria-label={isActive ? 'Pause timer' : 'Start timer'}
    >
      {/* Velvet shadow backdrop */}
      <div className="absolute inset-4 rounded-full bg-white dark:bg-warmgray-800 shadow-[inset_0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_10px_30px_rgba(0,0,0,0.4)]" />

      {/* SVG Tracks */}
      <svg
        height={radius * 2}
        width={radius * 2}
        className="absolute inset-0 w-full h-full transform -rotate-90 z-10 drop-shadow-md"
      >
        <defs>
          <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" /> {/* Emerald 500 */}
            <stop offset="100%" stopColor="#34d399" /> {/* Emerald 400 */}
          </linearGradient>
          <linearGradient id="shortBreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan 500 */}
            <stop offset="100%" stopColor="#67e8f9" /> {/* Cyan 300 */}
          </linearGradient>
          <linearGradient id="longBreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" /> {/* Violet 400 (Lavender) */}
            <stop offset="100%" stopColor="#c4b5fd" /> {/* Violet 300 */}
          </linearGradient>
        </defs>
        
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-warmgray-100 dark:text-warmgray-700/50 transition-colors"
        />
        
        {/* Progress track */}
        <circle
          stroke={phaseGradients[phase]}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-1000 ease-linear"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Inner content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
        <span className={cn("text-sm font-semibold tracking-widest uppercase mb-2 transition-colors duration-500", phaseColors[phase])}>
          {phase.replace('-', ' ')}
        </span>
        <span className="text-6xl sm:text-7xl font-extrabold text-warmgray-900 dark:text-white tabular-nums tracking-tighter drop-shadow-sm">
          {timeLeft}
        </span>
        <span className="text-sm font-medium text-warmgray-400 dark:text-warmgray-500 mt-2 tracking-wide">
          of {totalDuration}
        </span>
      </div>
      
      {/* Hover overlay for play/pause */}
      <div className={cn(
        "absolute inset-6 rounded-full bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-30",
        isActive ? "" : "backdrop-blur-sm"
      )}>
        <span className="bg-white/95 dark:bg-warmgray-900/95 text-warmgray-900 dark:text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg tracking-wide uppercase">
          {isActive ? 'Pause' : 'Start'}
        </span>
      </div>
    </button>
  );
};
