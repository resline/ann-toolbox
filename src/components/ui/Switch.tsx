import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '../../lib/cn';
import { Text } from './Text';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

/** Cały wiersz jest celem dotykowym — nie sam przełącznik. */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
  className,
}) => {
  const id = React.useId();
  return (
    <div className={cn('flex items-center justify-between gap-4 min-h-tap py-1', className)}>
      <label htmlFor={id} className="flex flex-col gap-0.5 min-w-0 cursor-pointer flex-1">
        <span className="text-base text-ink">{label}</span>
        {hint ? (
          <Text size="xs" tone="faint" as="span">
            {hint}
          </Text>
        ) : null}
      </label>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'relative shrink-0 w-[3.25rem] h-8 rounded-full transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))]',
          'data-[state=checked]:bg-module data-[state=unchecked]:bg-surface-active',
          'disabled:opacity-50'
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            'block w-6 h-6 rounded-full bg-surface-raised shadow-lift',
            'transition-transform will-change-transform',
            'translate-x-1 data-[state=checked]:translate-x-[1.625rem]'
          )}
        />
      </RadixSwitch.Root>
    </div>
  );
};
