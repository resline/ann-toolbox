import React, { useEffect, useState } from 'react';
import { ListTodo, Plus, Sparkles, Trash2 } from '../../../lib/icons';
import {
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  LabelText,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  Text,
} from '../../../components/ui';
import { start, common } from '../../../copy';
import { ResistanceSlider, type ResistanceLevel } from './ResistanceSlider';
import { startIds } from '../testIds';

export interface TaskDecomposerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (title: string, steps: string[]) => void;
}

type Screen = 'what' | 'resistance' | 'steps';

const ORDER: Screen[] = ['what', 'resistance', 'steps'];

/**
 * Rozbijanie zadania w trzech ekranach zamiast jednego długiego formularza.
 *
 * Poprzednia wersja mieściła w sobie tytuł, suwak i rosnącą listę pól naraz —
 * na telefonie klawiatura zjadała pół ekranu, a przycisk „Rozpocznij" był poza
 * zasięgiem. Tutaj każdy ekran zadaje jedno pytanie, a akcja jest przypięta
 * w stopce, zawsze nad klawiaturą.
 */
export const TaskDecomposerSheet: React.FC<TaskDecomposerSheetProps> = ({
  open,
  onOpenChange,
  onStart,
}) => {
  const copy = start.decomposer;

  const [screen, setScreen] = useState<Screen>('what');
  const [title, setTitle] = useState('');
  const [resistance, setResistance] = useState<ResistanceLevel>(3);
  const [steps, setSteps] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  // Zamknięcie arkusza czyści szkic — otwarcie zawsze zaczyna od pustej kartki.
  useEffect(() => {
    if (open) return;
    setScreen('what');
    setTitle('');
    setResistance(3);
    setSteps([]);
    setDraft('');
  }, [open]);

  const index = ORDER.indexOf(screen);
  const hint =
    screen === 'what' ? copy.what.hint : screen === 'resistance' ? copy.resistance.hint : copy.steps.hint;

  const goNext = () => setScreen(ORDER[Math.min(ORDER.length - 1, index + 1)]);
  const goBack = () => setScreen(ORDER[Math.max(0, index - 1)]);

  const addDraft = () => {
    const value = draft.trim();
    if (!value) return;
    setSteps((current) => [...current, value]);
    setDraft('');
  };

  /** Kroki są edytowalne — podpowiedzianą drabinkę da się przepisać na swoje. */
  const editStep = (at: number, value: string) =>
    setSteps((current) => current.map((step, i) => (i === at ? value : step)));

  const removeStep = (at: number) => setSteps((current) => current.filter((_, i) => i !== at));

  /**
   * Podpowiedź dopisuje brakujące szczeble na koniec, zamiast nadpisywać listę.
   * Dzięki temu przycisk może stać na ekranie także wtedy, gdy kroki już są,
   * a nic wpisanego ręcznie nie ginie po kliknięciu.
   */
  const suggest = () =>
    setSteps((current) => [
      ...current,
      ...copy.ladder[resistance].filter((step) => !current.includes(step)),
    ]);

  const collected = [...steps, draft].map((s) => s.trim()).filter((s) => s.length > 0);

  const begin = () => {
    if (!title.trim() || collected.length === 0) return;
    onStart(title.trim(), collected);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md">
        <SheetHeader title={copy.title} description={hint} closeLabel={common.action.close} />

        <SheetBody data-testid={startIds.decomposer}>
          <div className="flex flex-col gap-4">
            <LabelText>{copy.stepOf(index + 1, ORDER.length)}</LabelText>

            {screen === 'what' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (title.trim()) goNext();
                }}
              >
                <Field label={copy.what.label}>
                  {(props) => (
                    <Input
                      {...props}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={copy.what.placeholder}
                      autoComplete="off"
                      data-testid={startIds.decomposerTitleInput}
                    />
                  )}
                </Field>
              </form>
            ) : null}

            {screen === 'resistance' ? (
              <ResistanceSlider level={resistance} onChange={setResistance} />
            ) : null}

            {screen === 'steps' ? (
              <div className="flex flex-col gap-3">
                {/*
                  Podpowiedź stoi poza listą, więc nie znika po dodaniu pierwszego
                  kroku — drabinka bywa potrzebna dopiero wtedy, gdy własne pomysły
                  się kończą.
                */}
                <div className="flex items-baseline justify-between gap-3">
                  <Text size="sm" tone="muted" className="min-w-0 truncate">
                    {title}
                  </Text>
                  <Button
                    variant="quiet"
                    tone="module"
                    size="sm"
                    onClick={suggest}
                    data-testid={startIds.decomposerSuggest}
                    className="shrink-0"
                  >
                    <Sparkles className="w-4 h-4" aria-hidden />
                    {copy.steps.suggest}
                  </Button>
                </div>

                {steps.length > 0 ? (
                  <>
                    <ul className="flex flex-col gap-2">
                      {steps.map((step, i) => (
                        <li key={`step-${i}`} className="flex items-center gap-2">
                          <span className="numeric text-sm text-ink-faint w-5 shrink-0 text-right">
                            {i + 1}
                          </span>
                          <Field label={copy.steps.edit(i + 1)} hideLabel className="flex-1 min-w-0">
                            {(props) => (
                              <Input
                                {...props}
                                value={step}
                                onChange={(e) => editStep(i, e.target.value)}
                                placeholder={copy.steps.placeholder}
                                autoComplete="off"
                                data-testid={startIds.decomposerStep(i)}
                              />
                            )}
                          </Field>
                          <IconButton
                            label={copy.steps.remove(i + 1)}
                            variant="ghost"
                            tone="neutral"
                            onClick={() => removeStep(i)}
                            data-testid={startIds.decomposerStepRemove(i)}
                          >
                            <Trash2 className="w-5 h-5" aria-hidden />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                    <Text size="xs" tone="faint">
                      {copy.steps.editHint}
                    </Text>
                  </>
                ) : (
                  <EmptyState
                    title={copy.steps.empty}
                    description={copy.steps.emptyHint}
                    icon={<ListTodo className="w-6 h-6" strokeWidth={1.5} aria-hidden />}
                  />
                )}
              </div>
            ) : null}
          </div>
        </SheetBody>

        {/* Pole dopisywania siedzi tuż nad stopką, czyli nad klawiaturą. */}
        {screen === 'steps' ? (
          <form
            className="shrink-0 flex items-end gap-2 px-gutter pb-3"
            onSubmit={(e) => {
              e.preventDefault();
              addDraft();
            }}
          >
            <Field label={copy.steps.label} hideLabel className="flex-1 min-w-0">
              {(props) => (
                <Input
                  {...props}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={copy.steps.placeholder}
                  autoComplete="off"
                  data-testid={startIds.decomposerStepInput}
                />
              )}
            </Field>
            <IconButton
              label={copy.steps.add}
              type="submit"
              variant="secondary"
              tone="module"
              disabled={!draft.trim()}
              data-testid={startIds.decomposerStepAdd}
            >
              <Plus className="w-5 h-5" aria-hidden />
            </IconButton>
          </form>
        ) : null}

        <SheetFooter>
          {index > 0 ? (
            <Button
              variant="quiet"
              tone="neutral"
              onClick={goBack}
              data-testid={startIds.decomposerBack}
              className="flex-1"
            >
              {common.action.back}
            </Button>
          ) : null}

          {screen === 'steps' ? (
            <Button
              variant="primary"
              tone="module"
              onClick={begin}
              disabled={!title.trim() || collected.length === 0}
              data-testid={startIds.decomposerBegin}
              className="flex-1"
            >
              {copy.steps.begin}
            </Button>
          ) : (
            <Button
              variant="primary"
              tone="module"
              onClick={goNext}
              disabled={!title.trim()}
              data-testid={startIds.decomposerNext}
              className="flex-1"
            >
              {common.action.next}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
