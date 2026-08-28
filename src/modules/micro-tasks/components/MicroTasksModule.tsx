import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, FolderHeart, Plus, Trash2, Trophy } from '../../../lib/icons';
import { cn } from '../../../lib/cn';
import {
  Button,
  ConfirmDialog,
  Heading,
  IconButton,
  Section,
  Text,
} from '../../../components/ui';
import { start, common } from '../../../copy';
import { useMicroTasksStore } from '../store';
import { startIds } from '../testIds';
import type { MicroTask } from '../types';
import { CelebrationOverlay } from './CelebrationOverlay';
import { SingleStepFocusView } from './SingleStepFocusView';
import { StepProgressCard } from './StepProgressCard';
import { TaskDecomposerSheet } from './TaskDecomposerSheet';
import { TaskHistorySheet } from './TaskHistorySheet';
import { TemplatesHubSheet } from './TemplatesHubSheet';

type View = 'focus' | 'list';

/** Co znika po potwierdzeniu: odłożone zadanie doraźne albo zapisany zestaw. */
interface Removal {
  kind: 'parked' | 'template';
  id: string;
}

/**
 * Moduł Start.
 *
 * Cały stan zadania — które zadanie, który krok, ile zostało na liczniku —
 * mieszka w store z persystencją na kluczu `ann_micro_tasks`. Wcześniej trzymał
 * go useState tego pliku, więc zamknięcie karty w połowie ośmiokrokowego
 * zadania kasowało wszystko. Tutaj widok tylko czyta i woła akcje.
 */
export const MicroTasksModule: React.FC = () => {
  const tasks = useMicroTasksStore((s) => s.tasks);
  const userTemplates = useMicroTasksStore((s) => s.userTemplates);
  const activeTaskId = useMicroTasksStore((s) => s.activeTaskId);
  const currentStepId = useMicroTasksStore((s) => s.currentStepId);
  const startTask = useMicroTasksStore((s) => s.startTask);
  const startAdHocTask = useMicroTasksStore((s) => s.startAdHocTask);
  const abandonTask = useMicroTasksStore((s) => s.abandonTask);
  const discardTask = useMicroTasksStore((s) => s.discardTask);
  const deleteCustomTemplate = useMicroTasksStore((s) => s.deleteCustomTemplate);
  const nextStep = useMicroTasksStore((s) => s.nextStep);

  const [view, setView] = useState<View>('focus');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [decomposerOpen, setDecomposerOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  /** Jedno pytanie na dwa usunięcia — różni się tylko tym, co znika. */
  const [pendingRemoval, setPendingRemoval] = useState<Removal | null>(null);

  const activeTask: MicroTask | null = useMemo(
    () => tasks.find((t) => t.id === activeTaskId) ?? null,
    [tasks, activeTaskId]
  );

  // Nowe zadanie zawsze otwiera się w skupieniu, nie na liście.
  // Świętowanie poprzedniego zadania schodzi z ekranu razem z tym przejściem —
  // rozmyta warstwa nad świeżo zaczętym krokiem nie miałaby czego świętować.
  useEffect(() => {
    if (!activeTaskId) return;
    setView('focus');
    setCelebrating(false);
  }, [activeTaskId]);

  const stopCelebrating = useCallback(() => setCelebrating(false), []);

  const starters = useMemo(() => tasks.filter((t) => !t.isAdHoc && !t.isCustomTemplate).slice(0, 4), [tasks]);

  /**
   * Zadanie doraźne odłożone w połowie.
   *
   * Odłożenie już go nie kasuje, więc musi mieć drogę powrotną: w katalogu go
   * nie ma (to jednorazówka), a bez tego wiersza kroki wpisane ręcznie byłyby
   * nie do odzyskania. „Odłożone" znaczy: został choć jeden krok do zrobienia.
   */
  const parkedTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.isAdHoc && t.id !== activeTaskId && t.steps.some((s) => s.status === 'pending')
      ),
    [tasks, activeTaskId]
  );

  const doneCount = activeTask
    ? activeTask.steps.filter((s) => s.status === 'completed' || s.status === 'skipped').length
    : 0;
  const stepIndex = activeTask ? activeTask.steps.findIndex((s) => s.id === currentStepId) : -1;
  // Zapis sprzed zmiany struktury kroków mógłby zostawić zadanie bez bieżącego
  // kroku — wtedy lista jest jedynym ekranem, z którego da się wyjść.
  const activeView: View = stepIndex === -1 ? 'list' : view;

  const handleAdHoc = (title: string, steps: string[]) => {
    // Pusty identyfikator znaczy, że nie zostało ani jednego kroku —
    // zamknięcie arkusza zgubiłoby wtedy wpisany tytuł.
    if (startAdHocTask(title, steps)) setDecomposerOpen(false);
  };

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    if (pendingRemoval.kind === 'template') deleteCustomTemplate(pendingRemoval.id);
    else discardTask(pendingRemoval.id);
    setPendingRemoval(null);
  };

  const handleListDone = () => {
    const last = stepIndex === (activeTask?.steps.length ?? 0) - 1;
    nextStep();
    if (last) setCelebrating(true);
  };

  return (
    <div className="flex flex-col gap-section py-2">
      {!activeTask ? (
        <div className="flex flex-col gap-section" data-testid={startIds.home}>
          <div className="flex items-start justify-between gap-3">
            <Text size="base" tone="muted" className="max-w-sm">
              {start.lead}
            </Text>
            <IconButton
              label={start.home.history}
              variant="ghost"
              tone="neutral"
              onClick={() => setHistoryOpen(true)}
              data-testid={startIds.historyButton}
            >
              <Trophy className="w-5 h-5" aria-hidden />
            </IconButton>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              tone="module"
              size="lg"
              onClick={() => setDecomposerOpen(true)}
              data-testid={startIds.ownTaskButton}
            >
              <Plus className="w-5 h-5" aria-hidden />
              {start.home.own}
            </Button>

            <Button
              variant="quiet"
              tone="neutral"
              size="lg"
              onClick={() => setCatalogOpen(true)}
              data-testid={startIds.catalogButton}
            >
              <FolderHeart className="w-5 h-5" aria-hidden />
              {start.home.catalog}
            </Button>
          </div>

          {parkedTasks.length > 0 ? (
            <Section
              title={start.home.parked}
              description={start.home.parkedHint}
              data-testid={startIds.parked}
            >
              <ul className="flex flex-col">
                {parkedTasks.map((parked, i) => (
                  <TemplateRow
                    key={parked.id}
                    task={parked}
                    divided={i > 0}
                    onStart={() => startTask(parked.id)}
                    removeLabel={start.home.parkedDiscard(parked.title)}
                    removeTestId={startIds.parkedDiscard(parked.id)}
                    onRemove={() => setPendingRemoval({ kind: 'parked', id: parked.id })}
                  />
                ))}
              </ul>
            </Section>
          ) : null}

          {userTemplates.length > 0 ? (
            <Section title={start.home.mine}>
              <ul className="flex flex-col">
                {userTemplates.map((template, i) => (
                  <TemplateRow
                    key={template.id}
                    task={template}
                    divided={i > 0}
                    onStart={() => startTask(template.id)}
                    removeLabel={start.home.templateDelete(template.title)}
                    removeTestId={startIds.templateDelete(template.id)}
                    onRemove={() => setPendingRemoval({ kind: 'template', id: template.id })}
                  />
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title={start.home.quick} description={start.home.quickHint}>
            <ul className="flex flex-col">
              {starters.map((template, i) => (
                <TemplateRow
                  key={template.id}
                  task={template}
                  divided={i > 0}
                  onStart={() => startTask(template.id)}
                />
              ))}
            </ul>
          </Section>
        </div>
      ) : activeView === 'focus' ? (
        <SingleStepFocusView
          task={activeTask}
          onShowList={() => setView('list')}
          onFinished={() => setCelebrating(true)}
        />
      ) : (
        <div className="flex flex-col gap-4" data-testid={startIds.list}>
          <header className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <Heading level={2} className="truncate">
                {activeTask.title}
              </Heading>
              <Text size="sm" tone="muted" data-testid={startIds.listProgress}>
                {start.list.progress(doneCount, activeTask.steps.length)}
              </Text>
            </div>
            <Button
              variant="secondary"
              tone="module"
              onClick={() => setView('focus')}
              data-testid={startIds.listFocusView}
              className="shrink-0"
            >
              {start.list.focusView}
            </Button>
          </header>

          <ol className="flex flex-col gap-2">
            {activeTask.steps.map((step, index) => (
              <StepProgressCard
                key={step.id}
                stepId={step.id}
                index={index}
                title={step.title}
                status={step.status}
                isCurrent={step.id === currentStepId}
                onDone={handleListDone}
              />
            ))}
          </ol>

          <Button
            variant="ghost"
            tone="neutral"
            onClick={() => setAbandonOpen(true)}
            data-testid={startIds.listAbandon}
          >
            {start.list.abandon}
          </Button>
        </div>
      )}

      <TaskDecomposerSheet
        open={decomposerOpen}
        onOpenChange={setDecomposerOpen}
        onStart={handleAdHoc}
      />

      <TemplatesHubSheet
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onStarted={() => setCatalogOpen(false)}
      />

      <TaskHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />

      <ConfirmDialog
        open={abandonOpen}
        onOpenChange={setAbandonOpen}
        title={start.list.abandonTitle}
        description={start.list.abandonBody}
        confirmLabel={start.list.abandonConfirm}
        cancelLabel={common.action.cancel}
        onConfirm={abandonTask}
        tone="accent"
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(next) => {
          if (!next) setPendingRemoval(null);
        }}
        title={
          pendingRemoval?.kind === 'template'
            ? start.home.templateDeleteTitle
            : start.home.parkedDiscardTitle
        }
        description={
          pendingRemoval?.kind === 'template'
            ? start.home.templateDeleteBody
            : start.home.parkedDiscardBody
        }
        confirmLabel={common.action.remove}
        cancelLabel={common.action.cancel}
        onConfirm={confirmRemoval}
      />

      <CelebrationOverlay isVisible={celebrating} onComplete={stopCelebrating} />
    </div>
  );
};

interface TemplateRowProps {
  task: MicroTask;
  divided: boolean;
  onStart: () => void;
  /** Kosz obok wiersza — tylko tam, gdzie usuwanie ma sens (zestawy, odłożone). */
  onRemove?: () => void;
  removeLabel?: string;
  removeTestId?: string;
}

/** Wiersz szablonu — jedna linia i jedna cienka kreska zamiast kolorowego kafla. */
const TemplateRow: React.FC<TemplateRowProps> = ({
  task,
  divided,
  onStart,
  onRemove,
  removeLabel,
  removeTestId,
}) => (
  <li
    className={cn(
      'flex items-center gap-1',
      divided && 'shadow-[0_-1px_0_0_rgb(var(--line-faint))]'
    )}
  >
    <button
      type="button"
      onClick={onStart}
      data-testid={startIds.templateCard(task.id)}
      className={cn(
        'group flex-1 min-w-0 text-left flex items-center gap-3 py-4 min-h-tap rounded-control',
        'transition-colors hover:bg-surface-hover',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]'
      )}
    >
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-base text-ink leading-snug">{task.title}</span>
        <span className="text-xs text-ink-faint">{start.count.steps(task.steps.length)}</span>
      </span>
      <ArrowRight
        className="w-4 h-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>

    {onRemove && removeLabel ? (
      <IconButton
        label={removeLabel}
        variant="ghost"
        tone="neutral"
        onClick={onRemove}
        data-testid={removeTestId}
      >
        <Trash2 className="w-5 h-5" aria-hidden />
      </IconButton>
    ) : null}
  </li>
);
