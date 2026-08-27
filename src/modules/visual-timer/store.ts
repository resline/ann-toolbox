import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VisualTimerState, VisualTimerPreset } from './types';

export const DEFAULT_TIMER_PRESETS: VisualTimerPreset[] = [
  {
    id: 'p-1',
    title: 'Głębokie Skupienie',
    warmupMinutes: 2,
    flowMinutes: 25,
    cooldownMinutes: 3,
    ambience: 'brown-noise',
    breathing: 'box'
  },
  {
    id: 'p-2',
    title: 'Lekki Start',
    warmupMinutes: 5,
    flowMinutes: 15,
    cooldownMinutes: 2,
    ambience: 'rain',
    breathing: 'calm'
  }
];

interface VisualTimerStore extends VisualTimerState {
  startTimer: (presetId: string) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tick: () => void;
  skipPhase: () => void;
}

export const useVisualTimerStore = create<VisualTimerStore>()(
  persist(
    (set, get) => ({
      presets: DEFAULT_TIMER_PRESETS,
      activePresetId: null,
      currentPhase: null,
      timeRemainingSeconds: 0,
      totalPhaseSeconds: 0,
      isRunning: false,

      startTimer: (presetId) => {
        const preset = get().presets.find((p) => p.id === presetId);
        if (!preset) return;

        const warmupSecs = preset.warmupMinutes * 60;
        
        set({
          activePresetId: presetId,
          currentPhase: warmupSecs > 0 ? 'warmup' : 'flow',
          timeRemainingSeconds: warmupSecs > 0 ? warmupSecs : preset.flowMinutes * 60,
          totalPhaseSeconds: warmupSecs > 0 ? warmupSecs : preset.flowMinutes * 60,
          isRunning: true
        });
      },

      stopTimer: () => {
        set({
          activePresetId: null,
          currentPhase: null,
          timeRemainingSeconds: 0,
          totalPhaseSeconds: 0,
          isRunning: false
        });
      },

      pauseTimer: () => set({ isRunning: false }),
      resumeTimer: () => set({ isRunning: true }),

      tick: () => {
        const state = get();
        if (!state.isRunning) return;

        if (state.timeRemainingSeconds > 0) {
          set({ timeRemainingSeconds: state.timeRemainingSeconds - 1 });
        } else {
          state.skipPhase();
        }
      },

      skipPhase: () => {
        const state = get();
        const preset = state.presets.find((p) => p.id === state.activePresetId);
        if (!preset) return;

        if (state.currentPhase === 'warmup') {
          const flowSecs = preset.flowMinutes * 60;
          set({
            currentPhase: 'flow',
            timeRemainingSeconds: flowSecs,
            totalPhaseSeconds: flowSecs
          });
        } else if (state.currentPhase === 'flow') {
          const coolSecs = preset.cooldownMinutes * 60;
          if (coolSecs > 0) {
            set({
              currentPhase: 'cooldown',
              timeRemainingSeconds: coolSecs,
              totalPhaseSeconds: coolSecs
            });
          } else {
            state.stopTimer();
          }
        } else {
          state.stopTimer();
        }
      }
    }),
    {
      name: 'ann_visual_timer'
    }
  )
);
