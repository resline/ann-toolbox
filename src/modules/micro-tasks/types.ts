export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface MicroStep {
  id: string;
  title: string;
  status: StepStatus;
  estimatedMinutes?: number;
}

export interface TaskDecomposition {
  taskId: string;
  steps: MicroStep[];
}

export interface SessionCelebration {
  completedAt: string; // ISO String
  emoji: string;
  message: string;
}

export interface MicroTask {
  id: string;
  title: string;
  description?: string;
  steps: MicroStep[];
  celebration?: SessionCelebration;
}

export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

export interface MicroTasksState {
  tasks: MicroTask[];
  activeTaskId: string | null;
  currentStepId: string | null;
  timerState: TimerState;
  timeRemainingSeconds: number;
}
