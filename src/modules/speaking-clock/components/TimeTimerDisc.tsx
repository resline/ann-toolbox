/**
 * TimeTimerDisc Component
 *
 * Authentic visual ADHD Time Timer disc rendering a circular sector (wedge)
 * representing remaining time against total duration.
 * Provides calming transitions, soothing color palettes, and accessible progressbar semantics.
 */

import React, { useId } from 'react';
import { type TimeTimerColor } from '../types';

export interface TimeTimerDiscProps {
  totalSeconds: number;
  secondsRemaining: number;
  color?: TimeTimerColor;
  showNumbers?: boolean;
  direction?: 'clockwise' | 'counter-clockwise';
  centerTimeText?: string;
  centerLabel?: string;
  centerSublabel?: string;
  isActive?: boolean;
  onDiscClick?: () => void;
  size?: number;
  className?: string;
}

const COLOR_PALETTES: Record<
  TimeTimerColor,
  {
    from: string;
    to: string;
    glow: string;
    centerPillBg: string;
    centerPillBorder: string;
  }
> = {
  sage: {
    from: '#5B8272',
    to: '#4A6B5D',
    glow: 'rgba(74, 107, 93, 0.35)',
    centerPillBg: 'bg-sage-50 dark:bg-sage-950/50',
    centerPillBorder: 'border-sage-200 dark:border-sage-800',
  },
  amber: {
    from: '#F59E0B',
    to: '#D97706',
    glow: 'rgba(217, 119, 6, 0.35)',
    centerPillBg: 'bg-amber-50 dark:bg-amber-950/50',
    centerPillBorder: 'border-amber-200 dark:border-amber-800',
  },
  lavender: {
    from: '#8B5CF6',
    to: '#7C3AED',
    glow: 'rgba(124, 58, 237, 0.35)',
    centerPillBg: 'bg-purple-50 dark:bg-purple-950/50',
    centerPillBorder: 'border-purple-200 dark:border-purple-800',
  },
  rose: {
    from: '#F43F5E',
    to: '#E11D48',
    glow: 'rgba(225, 29, 72, 0.35)',
    centerPillBg: 'bg-rose-50 dark:bg-rose-950/50',
    centerPillBorder: 'border-rose-200 dark:border-rose-800',
  },
  ocean: {
    from: '#0EA5E9',
    to: '#0284C7',
    glow: 'rgba(2, 132, 199, 0.35)',
    centerPillBg: 'bg-sky-50 dark:bg-sky-950/50',
    centerPillBorder: 'border-sky-200 dark:border-sky-800',
  },
};

const NUMBERS_SERIES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const TimeTimerDisc: React.FC<TimeTimerDiscProps> = ({
  totalSeconds,
  secondsRemaining,
  color = 'sage',
  showNumbers = true,
  direction = 'counter-clockwise',
  centerTimeText,
  centerLabel,
  centerSublabel,
  isActive = false,
  onDiscClick,
  size = 280,
  className = '',
}) => {
  const gradientId = useId();
  const palette = COLOR_PALETTES[color] || COLOR_PALETTES.sage;

  const clampedRemaining = Math.max(0, Math.min(totalSeconds, secondsRemaining));
  const fraction = totalSeconds > 0 ? clampedRemaining / totalSeconds : 0;

  const cx = 150;
  const cy = 150;
  const discRadius = 112;
  const tickOuterRadius = 124;
  const majorTickInnerRadius = 114;
  const minorTickInnerRadius = 119;
  const numbersRadius = 137;

  const isFull = fraction >= 0.9999;
  const isEmpty = fraction <= 0.0001;

  let pathD = '';
  let endX = cx;
  let endY = cy - discRadius;
  if (!isFull && !isEmpty) {
    const angleSpan = fraction * 2 * Math.PI;
    const startX = cx;
    const startY = cy - discRadius;

    let sweepFlag: number;

    if (direction === 'counter-clockwise') {
      endX = cx - discRadius * Math.sin(angleSpan);
      endY = cy - discRadius * Math.cos(angleSpan);
      sweepFlag = 0;
    } else {
      endX = cx + discRadius * Math.sin(angleSpan);
      endY = cy - discRadius * Math.cos(angleSpan);
      sweepFlag = 1;
    }

    const largeArcFlag = fraction > 0.5 ? 1 : 0;
    pathD = `M ${cx} ${cy} L ${startX} ${startY} A ${discRadius} ${discRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX.toFixed(
      3
    )} ${endY.toFixed(3)} Z`;
  } else if (isFull) {
    endX = cx;
    endY = cy - discRadius;
  }

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const isMajor = i % 5 === 0;
    const angle = -Math.PI / 2 + (i / 60) * 2 * Math.PI;
    const rInner = isMajor ? majorTickInnerRadius : minorTickInnerRadius;

    const x1 = cx + rInner * Math.cos(angle);
    const y1 = cy + rInner * Math.sin(angle);
    const x2 = cx + tickOuterRadius * Math.cos(angle);
    const y2 = cy + tickOuterRadius * Math.sin(angle);

    return {
      id: `tick-${i}`,
      isMajor,
      x1,
      y1,
      x2,
      y2,
      angle,
    };
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onDiscClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onDiscClick();
    }
  };

  const isInteractive = Boolean(onDiscClick);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedRemaining)}
      aria-valuemin={0}
      aria-valuemax={totalSeconds}
      aria-label={centerLabel || 'Time Timer'}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onDiscClick}
      onKeyDown={handleKeyDown}
      style={{ width: size, height: size }}
      className={`relative select-none flex items-center justify-center rounded-full transition-transform active:scale-[0.99] ${
        isInteractive ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500' : ''
      } ${className}`}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main linear gradient */}
          <linearGradient
            id={`tt-gradient-${color}-${gradientId}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={palette.from} />
            <stop offset="100%" stopColor={palette.to} />
          </linearGradient>

          {/* Inner radial gradient / soft shading overlay */}
          <radialGradient
            id={`tt-radial-${gradientId}`}
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="60%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.25" />
          </radialGradient>

          <filter id={`shadow-${gradientId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Outer Bezel */}
        <circle
          cx={cx}
          cy={cy}
          r={144}
          className="stroke-warmgray-200/80 dark:stroke-warmgray-800 fill-warmgray-50/40 dark:fill-warmgray-900/40"
          strokeWidth="1.5"
        />

        {/* Dial Background Track */}
        <circle
          cx={cx}
          cy={cy}
          r={discRadius}
          className="fill-warmgray-100/70 dark:fill-warmgray-850/70 stroke-warmgray-200 dark:stroke-warmgray-800"
          strokeWidth="1"
        />

        {/* Filled Sector / Disc */}
        <g filter={`url(#shadow-${gradientId})`} className="time-timer-sector-group transition-all duration-300 ease-out">
          {isFull ? (
            <>
              <circle cx={cx} cy={cy} r={discRadius} fill={`url(#tt-gradient-${color}-${gradientId})`} className="time-timer-full-disc" />
              <circle cx={cx} cy={cy} r={discRadius} fill={`url(#tt-radial-${gradientId})`} />
            </>
          ) : (
            !isEmpty && (
              <>
                <path d={pathD} fill={`url(#tt-gradient-${color}-${gradientId})`} className="time-timer-sector" />
                <path d={pathD} fill={`url(#tt-radial-${gradientId})`} />
              </>
            )
          )}
        </g>

        {/* Smooth Velvet Pointer */}
        {(!isEmpty || isFull) && (
          <g style={{ transformOrigin: '150px 150px', transform: `rotate(${Math.atan2(endY - cy, endX - cx) * 180 / Math.PI + 90}deg)` }} className="transition-all duration-300 ease-out">
            <line x1={cx} y1={cy} x2={cx} y2={cy - discRadius} stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
            <circle cx={cx} cy={cy - discRadius + 6} r="4" fill="white" className="shadow-sm" />
          </g>
        )}

        {/* Subtle Active Pulse Ring */}
        {isActive && (
          <circle
            cx={cx}
            cy={cy}
            r={discRadius + 5}
            fill="none"
            stroke={palette.from}
            strokeWidth="2.5"
            strokeDasharray="4 4"
            className="time-timer-active-pulse animate-pulse opacity-70"
          />
        )}

        {/* Refined Dial Tick Marks (Hour/5-min dots) */}
        <g className="time-timer-ticks" pointerEvents="none">
          {ticks.map((tick) => {
            if (tick.isMajor) {
              const dotR = 2.5;
              const dotX = cx + ((majorTickInnerRadius + tickOuterRadius) / 2) * Math.cos(tick.angle);
              const dotY = cy + ((majorTickInnerRadius + tickOuterRadius) / 2) * Math.sin(tick.angle);
              return (
                <circle
                  key={tick.id}
                  cx={dotX}
                  cy={dotY}
                  r={dotR}
                  className="time-timer-major-tick fill-warmgray-400 dark:fill-warmgray-500"
                />
              );
            }
            return (
              <line
                key={tick.id}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                className="time-timer-minor-tick stroke-warmgray-300/60 dark:stroke-warmgray-700/60"
                strokeWidth={1}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Dial Rim Numbers */}
        {showNumbers && (
          <g className="time-timer-rim-numbers" pointerEvents="none">
            {NUMBERS_SERIES.map((num) => {
              const numAngle =
                direction === 'counter-clockwise'
                  ? -Math.PI / 2 - (num / 60) * 2 * Math.PI
                  : -Math.PI / 2 + (num / 60) * 2 * Math.PI;

              const numX = cx + numbersRadius * Math.cos(numAngle);
              const numY = cy + numbersRadius * Math.sin(numAngle);

              return (
                <text
                  key={`num-${num}`}
                  x={numX}
                  y={numY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[11px] font-medium fill-warmgray-500 dark:fill-warmgray-400 select-none"
                >
                  {num}
                </text>
              );
            })}
          </g>
        )}
      </svg>

      {/* Center Readout Card Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
        <div className={`flex flex-col items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/90 dark:bg-warmgray-900/90 backdrop-blur-md border border-warmgray-200/80 dark:border-warmgray-800 shadow-md p-2 transition-all ${isActive ? 'scale-[1.02]' : ''}`}>
          {centerLabel && (
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-warmgray-500 dark:text-warmgray-400 truncate max-w-[105px]">
              {centerLabel}
            </span>
          )}
          {centerTimeText && (
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-warmgray-900 dark:text-warmgray-100 tabular-nums my-0.5">
              {centerTimeText}
            </span>
          )}
          {centerSublabel && (
            <span className="text-[11px] font-medium text-warmgray-600 dark:text-warmgray-300 truncate max-w-[105px] leading-tight">
              {centerSublabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeTimerDisc;
