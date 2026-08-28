import React from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { cn } from '../../lib/cn';
import { Text } from './Text';

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  /** Dowolny podgląd — próbka koloru, ikona, miniatura. */
  preview?: React.ReactNode;
}

export interface RadioCardsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: RadioCardOption<T>[];
  /** Nazwa dostępna grupy. */
  label: string;
  columns?: 1 | 2 | 3;
  className?: string;
}

/**
 * Zastępuje trzy osobne, ręcznie pisane implementacje wyboru: motyw, paleta
 * tarczy i dźwięk tła. Na telefonie jest lepszy od <select>, więc Select nie
 * jest nam potrzebny wcale.
 */
export function RadioCards<T extends string>({
  value,
  onValueChange,
  options,
  label,
  columns = 1,
  className,
}: RadioCardsProps<T>) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      aria-label={label}
      className={cn(
        'grid gap-2',
        { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[columns],
        className
      )}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'group text-left rounded-card p-3 min-h-tap flex items-center gap-3',
            'bg-surface-raised shadow-hairline transition-colors',
            'hover:bg-surface-hover',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]',
            'data-[state=checked]:bg-module-soft data-[state=checked]:shadow-[0_0_0_2px_rgb(var(--module))]'
          )}
        >
          {option.preview ? <span className="shrink-0">{option.preview}</span> : null}
          <span className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-base font-medium text-ink group-data-[state=checked]:text-module-ink">
              {option.label}
            </span>
            {option.description ? (
              <Text size="xs" tone="faint" as="span">
                {option.description}
              </Text>
            ) : null}
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
