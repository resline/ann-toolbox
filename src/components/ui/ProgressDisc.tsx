import React from 'react';
import { cn } from '../../lib/cn';

export interface ProgressDiscProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Ile już minęło. Wartości spoza zakresu są przycinane. */
  value: number;
  /** Nazwa dostępna pierścienia — po polsku, z warstwy copy. */
  label: string;
  /**
   * Co czytnik ekranu ma powiedzieć zamiast gołego procentu.
   *
   * Dzieci elementu o roli `progressbar` są w ARIA prezentacyjne, więc licznik
   * w środku tarczy dla czytnika ekranu nie istnieje. `aria-valuetext` jest
   * jedyną kanoniczną drogą, żeby go ogłosić. Tablica skleja się przecinkami,
   * puste człony wypadają — wywołujący nie musi ich filtrować.
   */
  valueText?: string | Array<string | undefined | null | false>;
  size?: 'sm' | 'md' | 'lg';
  /** Grubość pierścienia w jednostkach viewBox (100 × 100). */
  thickness?: number;
  /** Przygasza pierścień, gdy odliczanie stoi. */
  paused?: boolean;
  /** Środek tarczy — warstwa czysto wizualna, ukryta przed czytnikiem ekranu. */
  children?: React.ReactNode;
}

const SIZE = {
  sm: 'max-w-[11rem]',
  md: 'max-w-[15rem]',
  lg: 'max-w-[19rem]',
} as const;

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Wspólny pierścień postępu.
 *
 * Jeden pierścień w akcencie modułu i nic poza nim: żadnych gradientów,
 * cieni ani pulsowania — to jest dokładnie ten rodzaj ruchu, którego przy
 * nadwrażliwości sensorycznej się unika. Kolor bierze się z aliasu `--module`,
 * ustawianego przez powłokę na `[data-module]`, więc tarcza koloruje się sama
 * i nie potrzebuje żadnego propa z kolorem.
 *
 * viewBox zamiast sztywnych wymiarów: tarcza skaluje się z szerokością ekranu.
 */
export const ProgressDisc: React.FC<ProgressDiscProps> = ({
  value,
  label,
  valueText,
  size = 'lg',
  thickness = 4,
  paused = false,
  className,
  children,
  ...rest
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const dashoffset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  const text = Array.isArray(valueText)
    ? valueText.filter(Boolean).join(', ')
    : valueText;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={text || undefined}
      className={cn('relative mx-auto w-full aspect-square', SIZE[size], className)}
      {...rest}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-line"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          className={cn(
            'text-module transition-[stroke-dashoffset] duration-1000 ease-linear',
            paused && 'opacity-50'
          )}
        />
      </svg>

      {children ? (
        <div
          aria-hidden
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};
