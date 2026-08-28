import React from 'react';
import { cn } from '../../lib/cn';
import { LabelText } from './Text';

export interface NumberDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Gotowy do wyświetlenia napis, np. "02:14" — formatowanie należy do wywołującego. */
  value: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Ogłaszanie zmian czytnikowi ekranu. Domyślnie wyłączone — licznik
   * odliczający co sekundę zagłuszyłby wszystko inne.
   */
  live?: 'off' | 'polite';
}

const SIZE = {
  sm: 'text-3xl',
  md: 'text-display-1',
  lg: 'text-display-2',
  xl: 'text-display-3',
} as const;

/**
 * Wspólny licznik dla całej aplikacji.
 *
 * Cyfry nigdy nie są animowane — migotanie przy każdej zmianie sekundy
 * rozprasza dokładnie tę osobę, dla której to powstaje.
 */
export const NumberDisplay: React.FC<NumberDisplayProps> = ({
  value,
  label,
  size = 'lg',
  live = 'off',
  className,
  ...rest
}) => (
  <div className={cn('flex flex-col items-center gap-1', className)} {...rest}>
    {label ? <LabelText>{label}</LabelText> : null}
    <span
      className={cn('numeric font-medium text-ink', SIZE[size])}
      aria-live={live === 'polite' ? 'polite' : undefined}
    >
      {value}
    </span>
  </div>
);
