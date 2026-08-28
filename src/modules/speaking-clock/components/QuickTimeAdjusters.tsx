import React from 'react';
import { cn } from '../../../lib/cn';
import { czas } from '../../../copy';
import { LabelText, Stack } from '../../../components/ui';
import { czasIds } from '../testIds';

export interface QuickTimeAdjustersProps {
  onAdjustMinutes: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Korekta w locie, bez zatrzymywania odliczania.
 *
 * „Coś mnie zatrzymało, potrzebuję jeszcze pięciu minut" to najczęstszy powód,
 * dla którego ktoś w ogóle dotyka telefonu w trakcie odliczania.
 */
const OPTIONS = [
  { minutes: -5, ...czas.adjust.minus5 },
  { minutes: 1, ...czas.adjust.plus1 },
  { minutes: 5, ...czas.adjust.plus5 },
  { minutes: 10, ...czas.adjust.plus10 },
];

export const QuickTimeAdjusters: React.FC<QuickTimeAdjustersProps> = ({
  onAdjustMinutes,
  disabled = false,
  className = '',
}) => (
  <Stack gap="sm" className={className}>
    <LabelText>{czas.adjust.label}</LabelText>
    <div className="grid grid-cols-4 gap-2" role="group" aria-label={czas.adjust.label}>
      {OPTIONS.map((option) => (
        <button
          key={option.minutes}
          type="button"
          data-testid={czasIds.quickAdjust(option.minutes)}
          onClick={() => onAdjustMinutes(option.minutes)}
          disabled={disabled}
          aria-label={option.aria}
          className={cn(
            'min-h-tap rounded-control text-sm font-medium numeric transition-colors',
            'bg-surface-sunken text-ink-muted hover:bg-surface-hover active:bg-surface-active',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  </Stack>
);

export default QuickTimeAdjusters;
