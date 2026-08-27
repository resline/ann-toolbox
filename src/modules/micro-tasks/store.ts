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
      activeTaskId: null,
      currentStepId: null,
      timerState: 'idle',
      timeRemainingSeconds: 0,

      startTask: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (task && task.steps.length > 0) {
          const firstStep = task.steps[0];
          set({
            activeTaskId: taskId,
            currentStepId: firstStep.id,
            timerState: 'idle',
            timeRemainingSeconds: (firstStep.estimatedMinutes || 2) * 60
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
        if (currentIndex !== -1 && currentIndex < task.steps.length - 1) {
          const next = task.steps[currentIndex + 1];
          set({
            currentStepId: next.id,
            timerState: 'idle',
            timeRemainingSeconds: (next.estimatedMinutes || 2) * 60
          });
        } else {
          // Finished
          set({ currentStepId: null, activeTaskId: null, timerState: 'finished' });
        }
      },

      finishTask: () => {
        set({ activeTaskId: null, currentStepId: null, timerState: 'finished' });
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
