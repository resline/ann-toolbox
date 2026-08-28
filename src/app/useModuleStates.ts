import { useDopamineMenuStore } from '../modules/dopamine-menu/store';
import { useMicroTasksStore } from '../modules/micro-tasks/store';
import { plWith } from '../copy';
import type { ModuleKey } from './routes';

/**
 * Żywy stan modułów pod ekran „Teraz".
 *
 * Wszystkie dane już leżą w tych samych store'ach, z których korzystają moduły,
 * więc to nie jest nowe źródło prawdy — tylko odczyt.
 *
 * Moduł bez własnego stanu zwraca `null`; ekran startowy pokazuje wtedy zdanie
 * o tym, po co się po niego sięga, zamiast udawać, że coś się dzieje.
 */
export type ModuleStates = Record<ModuleKey, string | null>;

export function useModuleStates(): ModuleStates {
  const sparksToday = useDopamineMenuStore((s) => s.completedToday.length);
  const activeTaskId = useMicroTasksStore((s) => s.activeTaskId);
  const currentStepId = useMicroTasksStore((s) => s.currentStepId);
  const tasks = useMicroTasksStore((s) => s.tasks);

  let startState: string | null = null;
  if (activeTaskId) {
    const task = tasks.find((t) => t.id === activeTaskId);
    if (task && task.steps.length > 0) {
      const index = task.steps.findIndex((s) => s.id === currentStepId);
      const position = index >= 0 ? index + 1 : 1;
      startState = `krok ${position} z ${task.steps.length} — „${task.title}"`;
    }
  }

  return {
    // Czas i Skupienie odczytują swój stan dopiero po przepięciu na store —
    // do tego czasu ekran startowy pokazuje ich przeznaczenie.
    czas: null,
    skupienie: null,
    energia: sparksToday > 0 ? `${plWith(sparksToday, ['iskierka', 'iskierki', 'iskierek'])} dzisiaj` : null,
    start: startState,
  };
}
