import React from 'react';
import { cn } from '../../../lib/cn';
import { LabelText, NumberDisplay, Text } from '../../../components/ui';
import { skupienieIds as ids } from '../testIds';

export interface MultiPhaseProgressDiscProps {
  /** 0–100. Ile fazy już minęło. */
  progress: number;
  /** Nazwa fazy po polsku — komponent nie tłumaczy enumów. */
  phaseLabel: string;
  /** Gotowy napis licznika, np. „24:59". */
  timeLeft: string;
  /** Podpis pod licznikiem, np. „z 25 min". */
  totalLabel: string;
  /** Nazwa dostępna paska postępu. */
  progressLabel: string;
  paused?: boolean;
}

/*
 * Tarcza sesji.
 *
 * Wcześniej miała trzy gradienty (emerald / cyan / violet), grubą kreskę i
 * dwa cienie — czyli dokładnie to, czego przy nadwrażliwości sensorycznej się
 * unika. Teraz jest jeden pierścień w akcencie modułu, reszta to typografia.
 * viewBox zamiast sztywnych wymiarów: tarcza skaluje się z szerokością ekranu.
 */
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const MultiPhaseProgressDisc: React.FC<MultiPhaseProgressDiscProps> = ({
  progress,
  phaseLabel,
  timeLeft,
  totalLabel,
  progressLabel,
  paused = false,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  const dashoffset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div
      data-testid={ids.disc}
      role="progressbar"
      aria-label={progressLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      // Dzieci elementu o roli progressbar są w ARIA prezentacyjne — czytnik
      // ekranu nie ogłosi nazwy fazy ani licznika, choć oba są w środku.
      // Kanoniczna droga to aria-valuetext, a warstwę wizualną chowamy.
      aria-valuetext={[phaseLabel, timeLeft, totalLabel].filter(Boolean).join(', ')}
      className="relative mx-auto w-full max-w-[19rem] aspect-square"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-line"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          className={cn(
            'text-module transition-[stroke-dashoffset] duration-1000 ease-linear',
            paused && 'opacity-50'
          )}
        />
      </svg>

      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
      >
        <LabelText tone="module" data-testid={ids.discPhase}>
          {phaseLabel}
        </LabelText>
        <NumberDisplay value={timeLeft} size="md" data-testid={ids.discValue} />
        <Text size="sm" tone="faint" data-testid={ids.discTotal}>
          {totalLabel}
        </Text>
      </div>
    </div>
  );
};
