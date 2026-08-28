import React from 'react';
import { cn } from '../../../lib/cn';
import type { TimeTimerColor } from '../types';
import { czasIds } from '../testIds';
import {
  DISC,
  numberPositions,
  pointerAngle,
  remainingFraction,
  sectorPath,
  tickPositions,
  type DiscDirection,
} from './discGeometry';

export interface TimeTimerDiscProps {
  totalSeconds: number;
  secondsRemaining: number;
  color?: TimeTimerColor;
  showNumbers?: boolean;
  direction?: DiscDirection;
  /** Duża liczba w środku tarczy — gotowa do wyświetlenia. */
  centerTimeText?: string;
  centerLabel?: string;
  centerSublabel?: string;
  isActive?: boolean;
  onDiscClick?: () => void;
  className?: string;
}

/**
 * Wizualna tarcza Time Timera.
 *
 * Pięć palet zostaje — to świadomy wybór użytkowniczki, nie ozdoba. Zmieniło
 * się to, że wartości pochodzą z tokenów, więc tarcza jest świadoma motywu:
 * bursztyn na czarnym ekranie przestał oślepiać.
 *
 * Zniknęły gradient liniowy, przyciemniający gradient promienisty, cień
 * rzucany i „szklana" pastylka w środku. Zostaje płaski kolor na papierze
 * i naga typografia — czytelność zamiast efektu.
 *
 * Rozmiar bierze się z kontenera; SVG skaluje się przez viewBox, więc
 * geometria nie zależy od pikseli.
 */
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
  className = '',
}) => {
  const fraction = remainingFraction(totalSeconds, secondsRemaining);
  const sector = sectorPath(fraction, direction);
  const ticks = tickPositions();
  const numbers = numberPositions(direction);

  const fill = `rgb(var(--disc-${color}-from))`;
  const edge = `rgb(var(--disc-${color}-to))`;

  const isInteractive = Boolean(onDiscClick);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onDiscClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onDiscClick();
    }
  };

  return (
    <div
      data-testid={czasIds.disc}
      data-accent={color}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, Math.min(totalSeconds, secondsRemaining)))}
      aria-valuemin={0}
      aria-valuemax={totalSeconds}
      aria-label={centerLabel || 'Tarcza czasu'}
      // Dzieci elementu o roli progressbar są prezentacyjne, więc sam odczyt
      // środkowy byłby dla czytnika ekranu niewidoczny.
      aria-valuetext={[centerTimeText, centerSublabel].filter(Boolean).join(', ') || undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onDiscClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative w-full max-w-[min(86vw,360px)] aspect-square select-none',
        'flex items-center justify-center rounded-full',
        isInteractive &&
          'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))] focus-visible:ring-offset-4 focus-visible:ring-offset-[rgb(var(--canvas))]',
        className
      )}
    >
      <svg className="w-full h-full" viewBox="0 0 300 300" fill="none" aria-hidden>
        {/* obręcz */}
        <circle
          cx={DISC.cx}
          cy={DISC.cy}
          r={DISC.bezelRadius}
          className="stroke-line-faint"
          strokeWidth="1"
          fill="none"
        />

        {/* tło tarczy */}
        <circle
          cx={DISC.cx}
          cy={DISC.cy}
          r={DISC.radius}
          className="fill-surface-sunken stroke-line"
          strokeWidth="1"
        />

        {/* wypełniony sektor */}
        <g className="transition-[d] duration-300 ease-out">
          {sector.isFull ? (
            <circle
              data-testid={czasIds.discFull}
              cx={DISC.cx}
              cy={DISC.cy}
              r={DISC.radius}
              fill={fill}
            />
          ) : sector.isEmpty ? null : (
            <path data-testid={czasIds.discSector} d={sector.d} fill={fill} />
          )}
        </g>

        {/* wskazówka — cienka kreska w kolorze krawędzi palety */}
        {!sector.isEmpty && (
          <g
            data-testid={czasIds.discPointer}
            style={{
              transformOrigin: `${DISC.cx}px ${DISC.cy}px`,
              transform: `rotate(${pointerAngle(sector.endX, sector.endY)}deg)`,
            }}
            className="transition-transform duration-300 ease-out"
          >
            <line
              x1={DISC.cx}
              y1={DISC.cy}
              x2={DISC.cx}
              y2={DISC.cy - DISC.radius}
              stroke={edge}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>
        )}

        {/* Piasta tarczy — jak w fizycznym Time Timerze. Bez niej wycinek
            przechodzi pod odczytem i etykieta staje się nieczytelna: jasny
            tekst na akcencie. To płaskie koło w kolorze powierzchni, nie
            „szklana" pastylka, którą ten redesign usunął. */}
        <circle cx={DISC.cx} cy={DISC.cy} r={66} className="fill-surface" />

        {/* pierścień aktywności — cienki, ciągły, bez pulsowania */}
        {isActive && (
          <circle
            cx={DISC.cx}
            cy={DISC.cy}
            r={DISC.radius + 6}
            fill="none"
            stroke={edge}
            strokeWidth="1.5"
            opacity="0.45"
          />
        )}

        {/* podziałka */}
        <g pointerEvents="none">
          {ticks.map((tick) =>
            tick.isMajor ? (
              <circle
                key={tick.id}
                data-testid={czasIds.discTick}
                data-major="true"
                cx={tick.dotX}
                cy={tick.dotY}
                r={2}
                className="fill-ink-faint"
              />
            ) : (
              <line
                key={tick.id}
                data-testid={czasIds.discTick}
                data-major="false"
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                className="stroke-line-strong"
                strokeWidth={1}
                strokeLinecap="round"
                opacity="0.5"
              />
            )
          )}
        </g>

        {/* cyfry na obwodzie */}
        {showNumbers && (
          <g data-testid={czasIds.discNumbers} pointerEvents="none">
            {numbers.map((n) => (
              <text
                key={`num-${n.value}`}
                x={n.x}
                y={n.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-ink-faint select-none"
                style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
              >
                {n.value}
              </text>
            ))}
          </g>
        )}
      </svg>

      {/* odczyt środkowy — naga typografia, bez pastylki i bez szkła */}
      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-10"
      >
        {centerLabel && (
          <span
            data-testid={czasIds.discLabel}
            className="text-2xs font-medium uppercase text-ink-faint truncate max-w-full"
          >
            {centerLabel}
          </span>
        )}
        {centerTimeText && (
          <span
            data-testid={czasIds.discValue}
            className="numeric text-[2.75rem] leading-tight font-medium text-ink"
          >
            {centerTimeText}
          </span>
        )}
        {centerSublabel && (
          <span className="text-xs text-ink-muted truncate max-w-full mt-1.5">{centerSublabel}</span>
        )}
      </div>
    </div>
  );
};

export default TimeTimerDisc;
