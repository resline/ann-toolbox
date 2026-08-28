import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MicroTasksState, StepStatus, TimerState } from './types';
import { MICRO_TASK_TEMPLATES } from './templates';

interface MicroTasksStore extends MicroTasksState {
  startTask: (taskId: string) => void;
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
        const foundInTemplates = state.tasks.find((t) => t.id === taskId);
        const foundInCustom = state.userTemplates.find((t) => t.id === taskId);
        
        let task = foundInTemplates || foundInCustom;

        if (task && task.steps.length > 0) {
          const resetSteps = task.steps.map(s => ({ ...s, status: 'pending' as StepStatus }));
          
          set({
            activeTaskId: taskId,
            currentStepId: resetSteps[0].id,
            timerState: 'idle',
            timeRemainingSeconds: (resetSteps[0].estimatedMinutes || 2) * 60,
            tasks: state.tasks.map(t => t.id === taskId ? { ...t, steps: resetSteps } : t)
          });
        }
      },

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
        
        if (task) {
          get().recordTaskCompletion(task);
          set({ activeTaskId: null, currentStepId: null, timerState: 'finished' });
        } else {
          set({ activeTaskId: null, currentStepId: null, timerState: 'finished' });
        }
      },

      setTimerState: (timerState) => set({ timerState }),
      
      tick: () => set((state) => ({
        timeRemainingSeconds: Math.max(0, state.timeRemainingSeconds - 1),
        timerState: state.timeRemainingSeconds <= 1 ? 'finished' : state.timerState
      })),
      
      resetTimer: (seconds) => set({ timeRemainingSeconds: seconds, timerState: 'idle' })
    }),
    {
      name: 'ann_micro_tasks'
    }
  )
);
