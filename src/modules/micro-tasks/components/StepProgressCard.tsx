import React from 'react';
import { Check, CheckCircle2, Circle, CircleDot } from '../../../lib/icons';
import { cn } from '../../../lib/cn';
import { Badge, Card, IconButton, Text } from '../../../components/ui';
import { start } from '../../../copy';
import { startIds } from '../testIds';
import type { StepStatus } from '../types';

export interface StepProgressCardProps {
  stepId: string;
  index: number;
  title: string;
  status: StepStatus;
  isCurrent: boolean;
  onDone?: () => void;
}

/**
 * Wiersz listy kroków.
 *
 * Odhaczyć da się tylko krok bieżący — lista jest mapą, nie pilotem. Wcześniej
 * klikalny był każdy wiersz, więc łatwo było zaznaczyć nie ten, o który chodziło.
 */
export const StepProgressCard: React.FC<StepProgressCardProps> = ({
  stepId,
  index,
  title,
  status,
  isCurrent,
  onDone,
}) => {
  const done = status === 'completed';
  const skipped = status === 'skipped';

  return (
    <Card
      as="li"
      variant={isCurrent ? 'paper' : 'outline'}
      className="flex items-center gap-3 px-card py-3 min-h-tap"
      data-testid={startIds.step(stepId)}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <span
        className={cn(
          'shrink-0',
          done ? 'text-module' : isCurrent ? 'text-module-ink' : 'text-ink-faint'
        )}
        aria-hidden
      >
        {done ? (
          <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
        ) : isCurrent ? (
          <CircleDot className="w-5 h-5" strokeWidth={1.75} />
        ) : (
          <Circle className="w-5 h-5" strokeWidth={1.75} />
        )}
      </span>

      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <Text
          as="span"
          size="base"
          tone={done || skipped ? 'faint' : 'default'}
          className={cn('leading-snug', done && 'line-through')}
        >
          {title}
        </Text>
        {isCurrent ? (
          <Badge tone="module" className="self-start">
            {start.list.statusNow}
          </Badge>
        ) : skipped ? (
          <Badge tone="neutral" className="self-start">
            {start.list.statusSkipped}
          </Badge>
        ) : null}
      </span>

      <span className="shrink-0 numeric text-sm text-ink-faint">{index + 1}</span>

      {isCurrent && onDone ? (
        <IconButton
          label={start.list.markDone}
          variant="secondary"
          tone="module"
          onClick={onDone}
          data-testid={startIds.stepDone(stepId)}
        >
          <Check className="w-5 h-5" aria-hidden />
        </IconButton>
      ) : null}
    </Card>
  );
};
