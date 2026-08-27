export type TimerPhase = 'warmup' | 'flow' | 'cooldown';

export type BreathingTechnique = 'box' | '4-7-8' | 'calm' | 'none';

export type SensoryAmbience = 'rain' | 'forest' | 'waves' | 'brown-noise' | 'pink-noise' | 'none';

export interface VisualTimerPreset {
  id: string;
  title: string;
  warmupMinutes: number;
  flowMinutes: number;
  cooldownMinutes: number;
  ambience: SensoryAmbience;
  breathing: BreathingTechnique;
}

export interface VisualTimerState {
  currentPhase: TimerPhase | null;
  timeRemainingSeconds: number;
  totalPhaseSeconds: number;
  isRunning: boolean;
  activePresetId: string | null;
  presets: VisualTimerPreset[];
}
