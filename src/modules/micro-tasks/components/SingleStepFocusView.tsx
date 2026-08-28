import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, LayoutList, Pause, Play, Plus, RotateCcw, Star } from '../../../lib/icons';
import { cn } from '../../../lib/cn';
import {
  Badge,
  Button,
  Field,
  Heading,
  IconButton,
  Input,
  LabelText,
  NumberDisplay,
  Text,
} from '../../../components/ui';
import { start, common } from '../../../copy';
import { useMicroTasksStore } from '../store';
import { startIds } from '../testIds';
import type { MicroTask } from '../types';

export interface SingleStepFocusViewProps {
  task: MicroTask;
  onShowList: () => void;
  /** Wywoływane, gdy właśnie zamknięty krok był ostatni. */
  onFinished: () => void;
}

const RING = 2 * Math.PI * 46;

function formatSeconds(total: number): string {
  const safe = Math.max(0, total);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Jeden krok na całym ekranie.
 *
 * Pomysł zostaje bez zmian — wielki krok, koraliki postępu, pierścień oporu.
 * Zmieniło się źródło: krok, postęp i licznik czyta store, więc zamknięcie
 * karty w połowie zadania nic już nie kasuje.
 */
export const SingleStepFocusView: React.FC<SingleStepFocusViewProps> = ({
  task,
  onShowList,
  onFinished,
}) => {
  const currentStepId = useMicroTasksStore((s) => s.currentStepId);
  const userTemplates = useMicroTasksStore((s) => s.userTemplates);
  const timerState = useMicroTasksStore((s) => s.timerState);
  const timeRemainingSeconds = useMicroTasksStore((s) => s.timeRemainingSeconds);
  const nextStep = useMicroTasksStore((s) => s.nextStep);
  const setStepStatus = useMicroTasksStore((s) => s.setStepStatus);
  const addStepToActiveTask = useMicroTasksStore((s) => s.addStepToActiveTask);
  const saveCustomTemplate = useMicroTasksStore((s) => s.saveCustomTemplate);
  const setTimerState = useMicroTasksStore((s) => s.setTimerState);
  const tick = useMicroTasksStore((s) => s.tick);
  const resetTimer = useMicroTasksStore((s) => s.resetTimer);

  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Ten sam zestaw zapisany drugi raz to śmieć na liście „Moje zestawy",
   * z której nie ma jak go potem wyrzucić z widoku skupienia. Porównujemy więc
   * tytuł i treść kroków, a przycisk gaśnie, gdy taki zestaw już jest.
   */
  const alreadySaved = useMemo(() => {
    const signature = (title: string, steps: { title: string }[]) =>
      [title, ...steps.map((s) => s.title)].join('\u0000');
    const current = signature(task.title, task.steps);
    return userTemplates.some((t) => signature(t.title, t.steps) === current);
  }, [userTemplates, task]);

  const stepIndex = task.steps.findIndex((s) => s.id === currentStepId);
  const step = stepIndex === -1 ? undefined : task.steps[stepIndex];
  const totalSteps = task.steps.length;
  const isLast = stepIndex === totalSteps - 1;
  const stepSeconds = (step?.estimatedMinutes ?? 2) * 60;

  const running = timerState === 'running';
  const over = timeRemainingSeconds === 0;
  const elapsedPct = stepSeconds > 0 ? ((stepSeconds - timeRemainingSeconds) / stepSeconds) * 100 : 0;

  // Odliczanie tyka w store, więc przeżywa przejście na inny ekran modułu.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  // Nowy krok — schowaj otwarty formularz dopisywania.
  useEffect(() => {
    setAddingStep(false);
    setNewStepTitle('');
  }, [currentStepId]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  if (!step) return null;

  const toggleTimer = () => {
    if (over) {
      resetTimer(stepSeconds);
      setTimerState('running');
      return;
    }
    setTimerState(running ? 'paused' : 'running');
  };

  const complete = () => {
    nextStep();
    if (isLast) onFinished();
  };

  /**
   * Pominięty krok zostaje pominięty — store nie wpisze takiego zadania do
   * „Ukończonych zadań", bo historia liczy kroki zrobione, nie przeklikane.
   * Samo domknięcie zadania nadal wypada świętować: pominięcie jednego kroku
   * z ośmiu to wciąż wieczór, w którym coś ruszyło.
   */
  const skip = () => {
    setStepStatus(step.id, 'skipped');
    nextStep();
    if (isLast) onFinished();
  };

  const submitNewStep = (e: React.FormEvent) => {
    e.preventDefault();
    const value = newStepTitle.trim();
    if (!value) return;
    addStepToActiveTask(value);
    setNewStepTitle('');
    setAddingStep(false);
  };

  const saveAsTemplate = () => {
    if (alreadySaved) return;
    const stamp = Date.now();
    saveCustomTemplate({
      id: `t-custom-${stamp}`,
      title: task.title,
      description: start.focus.savedDescription,
      category: task.category ?? 'home',
      isCustomTemplate: true,
      createdAt: new Date(stamp).toISOString(),
      steps: task.steps.map((s, i) => ({
        id: `s-custom-${stamp}-${i}`,
        title: s.title,
        status: 'pending',
        estimatedMinutes: s.estimatedMinutes ?? 2,
      })),
    });
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div className="flex flex-col gap-6 py-2" data-testid={startIds.focus}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <LabelText>{start.focus.heading}</LabelText>
          <Text as="p" size="sm" tone="muted" className="truncate" data-testid={startIds.focusTask}>
            {task.title}
          </Text>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <IconButton
            label={alreadySaved ? start.focus.saveTemplateDone : start.focus.saveTemplate}
            variant="ghost"
            tone="neutral"
            onClick={saveAsTemplate}
            disabled={alreadySaved}
            data-testid={startIds.focusSaveTemplate}
          >
            <Star className={cn('w-5 h-5', alreadySaved && 'fill-current')} aria-hidden />
          </IconButton>
          <IconButton
            label={start.focus.showList}
            variant="ghost"
            tone="neutral"
            onClick={onShowList}
            data-testid={startIds.focusShowList}
          >
            <LayoutList className="w-5 h-5" aria-hidden />
          </IconButton>
        </div>
      </header>

      {/*
        Region ogłaszający wisi w drzewie od początku i zmienia się tylko jego
        treść — czytniki ekranu ogłaszają zmiany w regionach, które już były,
        a węzeł wstawiony w komplecie razem z tekstem bywa pomijany. Nie może
        też chować się przez display:none, bo wtedy wypada z drzewa dostępności;
        stąd sr-only, które zostawia go widocznym dla czytnika.
      */}
      <div role="status" aria-live="polite" className="sr-only">
        {saved ? start.focus.saved : ''}
      </div>

      {saved ? (
        <div data-testid={startIds.focusSavedNotice}>
          <Badge tone="positive">{start.focus.saved}</Badge>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-6 text-center">
        <div
          role="progressbar"
          aria-label={start.focus.progress}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={stepIndex + 1}
          aria-valuetext={start.focus.stepOf(stepIndex + 1, totalSteps)}
          className="flex items-center justify-center gap-1.5 flex-wrap"
          data-testid={startIds.focusBeads}
        >
          {task.steps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === stepIndex
                  ? 'w-7 bg-module'
                  : i < stepIndex
                  ? 'w-1.5 bg-module-soft'
                  : 'w-1.5 bg-line'
              )}
            />
          ))}
        </div>

        <Heading
          level={2}
          size="display"
          className="text-balance max-w-xl"
          data-testid={startIds.focusStep}
        >
          {step.title}
        </Heading>

        <div className="flex flex-col items-center gap-3">
          <div
            className="relative w-40 h-40 flex items-center justify-center"
            role="group"
            aria-label={start.timer.label}
          >
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="46" className="fill-none stroke-line" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r="46"
                className="fill-none stroke-module transition-[stroke-dashoffset] duration-1000 ease-linear"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING - (RING * Math.min(100, elapsedPct)) / 100}
              />
            </svg>
            <NumberDisplay
              value={formatSeconds(timeRemainingSeconds)}
              size="sm"
              data-testid={startIds.timerValue}
            />
          </div>

          <Button
            variant="secondary"
            tone="module"
            onClick={toggleTimer}
            data-testid={startIds.timerToggle}
          >
            {over ? (
              <RotateCcw className="w-4 h-4" aria-hidden />
            ) : running ? (
              <Pause className="w-4 h-4" aria-hidden />
            ) : (
              <Play className="w-4 h-4" aria-hidden />
            )}
            {over ? start.timer.again : running ? start.timer.pause : start.timer.play}
          </Button>

          <Text size="sm" tone="faint" className="max-w-xs" data-testid={startIds.timerNote}>
            {over ? start.timer.over : start.timer.hint}
          </Text>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-stretch gap-2">
          <Button
            variant="primary"
            tone="module"
            size="lg"
            onClick={complete}
            data-testid={startIds.focusDone}
            className="flex-1 w-auto min-w-0"
          >
            <Check className="w-5 h-5" aria-hidden />
            {isLast ? start.focus.last : start.focus.done}
          </Button>
          <IconButton
            label={start.focus.skip}
            variant="quiet"
            tone="neutral"
            size="lg"
            onClick={skip}
            data-testid={startIds.focusSkip}
          >
            <ChevronRight className="w-5 h-5" aria-hidden />
          </IconButton>
        </div>

        {addingStep ? (
          <form className="flex flex-col gap-3" onSubmit={submitNewStep}>
            <Field label={start.focus.addStepLabel} hint={start.focus.addStepHint}>
              {(props) => (
                <Input
                  {...props}
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  data-testid={startIds.focusAddInput}
                />
              )}
            </Field>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="secondary"
                tone="module"
                disabled={!newStepTitle.trim()}
                data-testid={startIds.focusAddSubmit}
              >
                {common.action.add}
              </Button>
              <Button
                variant="ghost"
                tone="neutral"
                onClick={() => setAddingStep(false)}
                data-testid={startIds.focusAddCancel}
              >
                {common.action.cancel}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="ghost"
            tone="neutral"
            onClick={() => setAddingStep(true)}
            data-testid={startIds.focusAddStep}
          >
            <Plus className="w-4 h-4" aria-hidden />
            {start.focus.addStep}
          </Button>
        )}
      </div>
    </div>
  );
};
