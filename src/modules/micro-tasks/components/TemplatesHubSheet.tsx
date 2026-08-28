import React, { useMemo, useState } from 'react';
import { FolderHeart, Star } from '../../../lib/icons';
import { cn } from '../../../lib/cn';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  Text,
} from '../../../components/ui';
import { start, common } from '../../../copy';
import { useMicroTasksStore } from '../store';
import { startIds } from '../testIds';
import type { MicroTask } from '../types';

export interface TemplatesHubSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wywoływane po uruchomieniu zadania — moduł zamyka arkusz i wchodzi w skupienie. */
  onStarted: () => void;
}

type FilterValue = 'all' | 'home' | 'work' | 'health' | 'selfcare' | 'mine';

const FILTERS: FilterValue[] = ['all', 'home', 'work', 'health', 'selfcare', 'mine'];

function matches(task: MicroTask, filter: FilterValue): boolean {
  if (filter === 'all') return true;
  if (filter === 'mine') return !!task.isCustomTemplate;
  return task.category === filter && !task.isCustomTemplate;
}

/**
 * Katalog gotowych zestawów kroków.
 *
 * Uruchomienie idzie przez store — wcześniej modal wołał startTask i zamykał
 * się, a widok czytał własny stan lokalny, więc nie działo się nic.
 */
export const TemplatesHubSheet: React.FC<TemplatesHubSheetProps> = ({
  open,
  onOpenChange,
  onStarted,
}) => {
  const tasks = useMicroTasksStore((s) => s.tasks);
  const userTemplates = useMicroTasksStore((s) => s.userTemplates);
  const startTask = useMicroTasksStore((s) => s.startTask);

  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    // Zadania doraźne to jednorazówki złożone w arkuszu — w katalogu byłyby szumem.
    const all = [...userTemplates, ...tasks.filter((t) => !t.isAdHoc && !t.isCustomTemplate)];

    return all.filter((task) => {
      const inText =
        !phrase ||
        task.title.toLowerCase().includes(phrase) ||
        (task.description?.toLowerCase().includes(phrase) ?? false);
      return inText && matches(task, filter);
    });
  }, [tasks, userTemplates, search, filter]);

  const run = (taskId: string) => {
    startTask(taskId);
    onStarted();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="full">
        <SheetHeader title={start.catalog.title} closeLabel={common.action.close} />

        <SheetBody data-testid={startIds.catalog}>
          <div className="flex flex-col gap-4">
            <Field label={start.catalog.search} hideLabel>
              {(props) => (
                <Input
                  {...props}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={start.catalog.searchPlaceholder}
                  data-testid={startIds.catalogSearch}
                />
              )}
            </Field>

            <div className="flex gap-2 overflow-x-auto -mx-gutter px-gutter pb-1">
              {FILTERS.map((value) => {
                const activeFilter = value === filter;
                return (
                  <Button
                    key={value}
                    variant={activeFilter ? 'secondary' : 'ghost'}
                    tone={activeFilter ? 'module' : 'neutral'}
                    aria-pressed={activeFilter}
                    onClick={() => setFilter(value)}
                    data-testid={startIds.catalogFilter(value)}
                    className={cn('shrink-0 rounded-full', !activeFilter && 'shadow-hairline')}
                  >
                    {start.catalog.filters[value]}
                  </Button>
                );
              })}
            </div>

            {visible.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {visible.map((task) => (
                  <Card
                    as="li"
                    key={task.id}
                    className="flex items-center gap-3 px-card py-3"
                    data-testid={startIds.catalogItem(task.id)}
                  >
                    <span className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="flex items-center gap-2 min-w-0">
                        <Text as="span" size="base" className="leading-snug">
                          {task.title}
                        </Text>
                        {task.isCustomTemplate ? (
                          <Badge tone="module" className="shrink-0">
                            <Star className="w-3 h-3" aria-hidden />
                            {start.catalog.mineBadge}
                          </Badge>
                        ) : null}
                      </span>
                      <Text as="span" size="xs" tone="faint">
                        {task.description
                          ? `${task.description} · ${start.count.steps(task.steps.length)}`
                          : start.count.steps(task.steps.length)}
                      </Text>
                    </span>

                    <Button
                      variant="secondary"
                      tone="module"
                      onClick={() => run(task.id)}
                      data-testid={startIds.catalogRun(task.id)}
                      className="shrink-0"
                    >
                      {start.catalog.run}
                    </Button>
                  </Card>
                ))}
              </ul>
            ) : (
              <div data-testid={startIds.catalogEmpty}>
                <EmptyState
                  title={start.catalog.emptyTitle}
                  description={start.catalog.emptyHint}
                  icon={<FolderHeart className="w-6 h-6" strokeWidth={1.5} aria-hidden />}
                />
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
