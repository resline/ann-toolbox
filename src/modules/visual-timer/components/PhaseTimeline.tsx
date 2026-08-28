import React from 'react';
import { cn } from '../../../lib/cn';
import { LabelText } from '../../../components/ui';
import type { TimerPhase } from '../types';
import { skupienieIds as ids } from '../testIds';

export interface TimelineItem {
  phase: TimerPhase;
  /** Nazwa fazy po polsku. */
  label: string;
  /** Gotowy napis z czasem, np. „25 min". */
  minutesLabel: string;
  /** Proporcja szerokości paska — po prostu długość fazy w minutach. */
  weight: number;
}

export interface PhaseTimelineProps {
  items: TimelineItem[];
  current: TimerPhase | null;
  /** Nazwa dostępna listy. */
  label: string;
}

/**
 * Plan sesji: trzy fazy presetu, szerokość paska proporcjonalna do długości.
 *
 * Wcześniej pokazywał cztery fazy Pomodoro z zaślepki w komponencie — czyli
 * coś, czego w danych nigdy nie było.
 */
export const PhaseTimeline: React.FC<PhaseTimelineProps> = ({ items, current, label }) => {
  const currentIndex = items.findIndex((item) => item.phase === current);

  return (
    <ol data-testid={ids.timeline} aria-label={label} className="flex items-stretch gap-2 w-full">
      {items.map((item, index) => {
        const isCurrent = index === currentIndex;
        const isDone = currentIndex > -1 && index < currentIndex;

        return (
          <li
            key={item.phase}
            data-testid={ids.timelinePhase(item.phase)}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex flex-col gap-1.5 min-w-0"
            style={{ flexGrow: item.weight, flexBasis: 0 }}
          >
            <span
              aria-hidden
              className={cn(
                'h-1 rounded-full transition-colors',
                isCurrent ? 'bg-module' : isDone ? 'bg-module/40' : 'bg-line'
              )}
            />
            <span className="flex flex-col gap-0.5 min-w-0">
              <LabelText tone={isCurrent ? 'module' : 'faint'} className="truncate">
                {item.label}
              </LabelText>
              <span
                className={cn(
                  'numeric text-xs',
                  isCurrent ? 'text-ink' : 'text-ink-faint'
                )}
              >
                {item.minutesLabel}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};
