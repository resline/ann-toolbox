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

export type TaskCategory = 'Dom' | 'Praca' | 'Zdrowie' | 'Dobrostan' | 'Moje Szablony';

export interface MicroTask {
  id: string;
  title: string;
  description?: string;
  steps: MicroStep[];
  celebration?: SessionCelebration;
  category?: 'home' | 'work' | 'health' | 'selfcare';
  resistanceLevel?: 1 | 2 | 3 | 4 | 5;
  isCustomTemplate?: boolean;
  createdAt?: string;
}

export interface TaskHistoryEntry {
  id: string;
  title: string;
  category?: 'home' | 'work' | 'health' | 'selfcare';
  completedAt: string;
  stepsCount: number;
}

export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

export interface MicroTasksState {
  tasks: MicroTask[];
  activeTaskId: string | null;
  currentStepId: string | null;
  timerState: TimerState;
  timeRemainingSeconds: number;
  userTemplates: MicroTask[];
  taskHistory: TaskHistoryEntry[];
  saveCustomTemplate: (task: MicroTask) => void;
  deleteCustomTemplate: (id: string) => void;
  addStepToActiveTask: (title: string) => void;
  editActiveTaskStep: (stepId: string, title: string) => void;
  removeStepFromActiveTask: (stepId: string) => void;
  recordTaskCompletion: (task: MicroTask) => void;
  clearTaskHistory: () => void;
}
