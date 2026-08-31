import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, passthroughMigration, versionedPersist } from '../../lib/storage/persist';
import { MicroTasksState, StepStatus, TimerState } from './types';
import { MICRO_TASK_TEMPLATES } from './templates';

export const AD_HOC_PREFIX = 't-adhoc-';

interface MicroTasksStore extends MicroTasksState {
  startTask: (taskId: string) => void;
  /**
   * Zadanie złożone w locie w arkuszu rozbijania.
   *
   * Bez tego ścieżka „własne zadanie" nie miała dokąd zapisać kroków —
   * widok trzymał je w useState i traciła je każda zmiana karty.
   * Zwraca identyfikator nowego zadania albo pusty napis, gdy nie było
   * ani jednego niepustego kroku.
   */
  startAdHocTask: (title: string, stepTitles: string[]) => string;
  /**
   * Wyjście z zadania bez wpisywania go do historii.
   *
   * Zadanie ZOSTAJE — także doraźne, złożone w arkuszu. Potwierdzenie obiecuje
   * powrót do niego, a dla zadania doraźnego ten wpis jest jedynym miejscem,
   * gdzie te kroki w ogóle istnieją. Kasuje wyłącznie `discardTask`.
   */
  abandonTask: () => void;
  /** Usunięcie zadania razem z krokami — tylko na wyraźne żądanie z ekranu. */
  discardTask: (taskId: string) => void;
  setStepStatus: (stepId: string, status: StepStatus) => void;
  nextStep: () => void;
  finishTask: () => void;
  
  // Timer actions
  setTimerState: (state: TimerState) => void;
  tick: () => void;
  resetTimer: (seconds: number) => void;
}

export const useMicroTasksStore = create<MicroTasksStore>()(
  persist(
    (set, get) => ({
      tasks: MICRO_TASK_TEMPLATES,
      userTemplates: [],
      taskHistory: [],
      activeTaskId: null,
      currentStepId: null,
      timerState: 'idle',
      timeRemainingSeconds: 0,

      saveCustomTemplate: (task) => set((state) => ({ userTemplates: [...state.userTemplates, task] })),
      deleteCustomTemplate: (id) => set((state) => ({ userTemplates: state.userTemplates.filter(t => t.id !== id) })),
      
      addStepToActiveTask: (title) => set((state) => {
        if (!state.activeTaskId) return state;
        return {
          tasks: state.tasks.map(t => {
            if (t.id === state.activeTaskId) {
              return { ...t, steps: [...t.steps, { id: 's-' + Date.now(), title, status: 'pending', estimatedMinutes: 2 }] };
            }
            return t;
          })
        };
      }),
      
      editActiveTaskStep: (stepId, title) => set((state) => {
        if (!state.activeTaskId) return state;
        return {
          tasks: state.tasks.map(t => {
            if (t.id === state.activeTaskId) {
              return { ...t, steps: t.steps.map(s => s.id === stepId ? { ...s, title } : s) };
            }
            return t;
          })
        };
      }),
      
      removeStepFromActiveTask: (stepId) => set((state) => {
        if (!state.activeTaskId) return state;
        return {
          tasks: state.tasks.map(t => {
            if (t.id === state.activeTaskId) {
              return { ...t, steps: t.steps.filter(s => s.id !== stepId) };
            }
            return t;
          })
        };
      }),
      
      recordTaskCompletion: (task) => set((state) => ({
        taskHistory: [...state.taskHistory, {
          id: task.id + '-' + Date.now(),
          title: task.title,
          category: task.category,
          completedAt: new Date().toISOString(),
          stepsCount: task.steps.length
        }]
      })),
      
      clearTaskHistory: () => set({ taskHistory: [] }),

      startTask: (taskId) => {
        const state = get();
        const foundInTasks = state.tasks.find((t) => t.id === taskId);
        const task = foundInTasks || state.userTemplates.find((t) => t.id === taskId);

        if (task && task.steps.length > 0) {
          const resetSteps = task.steps.map(s => ({ ...s, status: 'pending' as StepStatus }));

          // Szablon użytkowniczki żyje poza `tasks`, a cała progresja kroków
          // szuka zadania właśnie tam — bez tej kopii nextStep nie znajdował
          // zadania i „uruchom" nic nie robiło.
          const tasks = foundInTasks
            ? state.tasks.map(t => t.id === taskId ? { ...t, steps: resetSteps } : t)
            : [...state.tasks, { ...task, steps: resetSteps }];

          set({
            activeTaskId: taskId,
            currentStepId: resetSteps[0].id,
            timerState: 'idle',
            timeRemainingSeconds: (resetSteps[0].estimatedMinutes || 2) * 60,
            tasks
          });
        }
      },

      startAdHocTask: (title, stepTitles) => {
        const stamp = Date.now();
        const steps = stepTitles
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
          .map((t, i) => ({
            id: `s-adhoc-${stamp}-${i}`,
            title: t,
            status: 'pending' as StepStatus,
            estimatedMinutes: 2
          }));

        if (steps.length === 0) return '';

        // sufiks losowy, bo dwa wywołania w tej samej milisekundzie dałyby ten sam klucz
        const id = `${AD_HOC_PREFIX}${stamp}-${Math.random().toString(36).slice(2, 7)}`;

        set((state) => ({
          // Zamknięte zadania doraźne znikają — zostawione w `tasks` rosłyby
          // w localStorage bez końca. Odłożone (z krokami jeszcze do zrobienia)
          // zostają: ekran startowy obiecuje, że można do nich wrócić, więc
          // złożenie kolejnego zadania nie może ich po cichu skasować.
          tasks: [
            ...state.tasks.filter(
              (t) => !t.isAdHoc || t.steps.some((s) => s.status === 'pending')
            ),
            { id, title: title.trim(), steps, isAdHoc: true, createdAt: new Date(stamp).toISOString() }
          ]
        }));

        get().startTask(id);
        return id;
      },

      abandonTask: () => set((state) => ({
        // Kroki wracają do stanu wyjściowego — dokładnie to, co obiecuje pytanie
        // przed odłożeniem. Samo zadanie zostaje: doraźne czeka na ekranie
        // startowym jako odłożone, gotowe zadanie wraca do katalogu.
        tasks: state.tasks.map((t) =>
          t.id === state.activeTaskId
            ? { ...t, steps: t.steps.map((s) => ({ ...s, status: 'pending' as StepStatus })) }
            : t
        ),
        activeTaskId: null,
        currentStepId: null,
        timerState: 'idle',
        timeRemainingSeconds: 0
      })),

      discardTask: (taskId) => set((state) => {
        const tasks = state.tasks.filter((t) => t.id !== taskId);
        if (state.activeTaskId !== taskId) return { tasks };
        return {
          tasks,
          activeTaskId: null,
          currentStepId: null,
          timerState: 'idle' as TimerState,
          timeRemainingSeconds: 0
        };
      }),

      setStepStatus: (stepId, status) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== state.activeTaskId) return task;
            return {
              ...task,
              steps: task.steps.map((step) =>
                step.id === stepId ? { ...step, status } : step
              ),
            };
          }),
        }));
      },

      nextStep: () => {
        const state = get();
        const task = state.tasks.find((t) => t.id === state.activeTaskId);
        if (!task) return;

        const currentIndex = task.steps.findIndex((s) => s.id === state.currentStepId);
        // Mark current as completed if not skipped
        if (state.currentStepId) {
            const currentStep = task.steps.find(s => s.id === state.currentStepId);
            if (currentStep && currentStep.status === 'pending') {
                get().setStepStatus(state.currentStepId, 'completed');
            }
        }

        if (currentIndex !== -1 && currentIndex < task.steps.length - 1) {
          const next = task.steps[currentIndex + 1];
          set({
            currentStepId: next.id,
            timerState: 'idle',
            timeRemainingSeconds: (next.estimatedMinutes || 2) * 60
          });
        } else {
          // Finished
          get().finishTask();
        }
      },

      finishTask: () => {
        const state = get();
        const task = state.tasks.find((t) => t.id === state.activeTaskId);

        // Historia jest dowodem rzeczowym na zrobione kroki, więc wchodzi na nią
        // tylko zadanie faktycznie doprowadzone do końca. Krok pominięty nie jest
        // krokiem zrobionym — inaczej listę „Ukończone zadania" dałoby się
        // napełnić samym klikaniem „pomiń".
        if (task && task.steps.every((s) => s.status === 'completed')) {
          get().recordTaskCompletion(task);
        }
        set({ activeTaskId: null, currentStepId: null, timerState: 'finished' });
      },

      setTimerState: (timerState) => set({ timerState }),
      
      tick: () => set((state) => ({
        timeRemainingSeconds: Math.max(0, state.timeRemainingSeconds - 1),
        timerState: state.timeRemainingSeconds <= 1 ? 'finished' : state.timerState
      })),
      
      resetTimer: (seconds) => set({ timeRemainingSeconds: seconds, timerState: 'idle' })
    }),
    // Wersja 1 to punkt zerowy — kształt zgodny z tym, co już jest zapisane.
    versionedPersist<MicroTasksStore>({
      key: STORAGE_KEYS.start,
      version: 1,
      migrate: passthroughMigration,
    })
  )
);
