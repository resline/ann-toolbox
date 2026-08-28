import React from 'react';
import { Trophy } from '../../../lib/icons';
import {
  Card,
  EmptyState,
  NumberDisplay,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  Text,
} from '../../../components/ui';
import { start, common } from '../../../copy';
import { useMicroTasksStore } from '../store';
import { startIds } from '../testIds';

export interface TaskHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMAT.format(date);
}

/** Lista zamkniętych zadań — dowód rzeczowy na dni, w których wydaje się, że nic. */
export const TaskHistorySheet: React.FC<TaskHistorySheetProps> = ({ open, onOpenChange }) => {
  const taskHistory = useMicroTasksStore((s) => s.taskHistory);
  const entries = [...taskHistory].reverse();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md">
        <SheetHeader title={start.history.title} closeLabel={common.action.close} />
        <SheetBody data-testid={startIds.history}>
          <div className="flex flex-col gap-4">
            <Card variant="sunken" className="flex flex-col items-center gap-2 px-card py-6">
              <NumberDisplay
                value={String(taskHistory.length)}
                label={start.history.countLabel}
                size="md"
                data-testid={startIds.historyCount}
              />
              <Text size="sm" tone="muted" className="text-center max-w-xs">
                {start.history.praise}
              </Text>
            </Card>

            {entries.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <Card
                    as="li"
                    key={entry.id}
                    variant="outline"
                    className="flex items-baseline justify-between gap-3 px-card py-3"
                    data-testid={startIds.historyEntry(entry.id)}
                  >
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <Text as="span" size="base" className="leading-snug">
                        {entry.title}
                      </Text>
                      <Text as="span" size="xs" tone="faint">
                        {start.history.entrySteps(entry.stepsCount)}
                      </Text>
                    </span>
                    <Text as="span" size="xs" tone="faint" className="shrink-0">
                      {formatDate(entry.completedAt)}
                    </Text>
                  </Card>
                ))}
              </ul>
            ) : (
              <div data-testid={startIds.historyEmpty}>
                <EmptyState
                  title={start.history.emptyTitle}
                  description={start.history.emptyHint}
                  icon={<Trophy className="w-6 h-6" strokeWidth={1.5} aria-hidden />}
                />
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
