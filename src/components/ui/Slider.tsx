import React from 'react';
import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from '../../lib/cn';

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Nazwa dostępna — wymagana, w polskim brzmieniu. */
  label: string;
  /** Czytelna wartość dla czytnika ekranu, np. „60 procent". */
  valueText?: string;
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  valueText,
  disabled,
  className,
}) => (
  <RadixSlider.Root
    className={cn('relative flex items-center select-none touch-none w-full h-tap', className)}
    value={[value]}
    onValueChange={([v]) => onValueChange(v)}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
    aria-label={label}
  >
    <RadixSlider.Track className="relative grow h-1.5 rounded-full bg-surface-active">
      <RadixSlider.Range className="absolute h-full rounded-full bg-module" />
    </RadixSlider.Track>
    <RadixSlider.Thumb
      aria-label={label}
      aria-valuetext={valueText}
      className={cn(
        'block w-6 h-6 rounded-full bg-surface-raised shadow-lift shadow-hairline',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))]',
        'disabled:opacity-50'
      )}
    />
  </RadixSlider.Root>
);
