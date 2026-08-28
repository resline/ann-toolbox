import { describe, it, expect, beforeEach } from 'vitest';
import { useMicroTasksStore } from './store';

describe('MicroTasks Store', () => {
  beforeEach(() => {
    useMicroTasksStore.setState({
      tasks: useMicroTasksStore.getInitialState().tasks,
      activeTaskId: null,
      currentStepId: null,
      timerState: 'idle',
      timeRemainingSeconds: 0,
      taskHistory: [],
      userTemplates: []
    });
    localStorage.clear();
  });

  it('loads task templates (Sprzątanie, Mail, Trening, Projekt)', () => {
    const { tasks } = useMicroTasksStore.getState();
    expect(tasks).toHaveLength(15);
    expect(tasks.map(t => t.title)).toContain('Sprzątanie kuchni po gotowaniu');
    expect(tasks.map(t => t.title)).toContain('Rozpoczęcie trudnego maila');
    expect(tasks.map(t => t.title)).toContain('Zebranie się na trening / spacer');
    expect(tasks.map(t => t.title)).toContain('Organizacja planu dnia');
  });

  it('tests task decomposition into sub-steps', () => {
    const { tasks } = useMicroTasksStore.getState();
    const task = tasks.find(t => t.title === 'Sprzątanie kuchni po gotowaniu');
    expect(task).toBeDefined();
    expect(task!.steps.length).toBeGreaterThan(1);
    expect(task!.steps[0].title).toBe('Weź gąbkę');
  });

  it('starts a task and initializes single-step progression', () => {
    const { startTask } = useMicroTasksStore.getState();
    startTask('t-home-1');
    const state = useMicroTasksStore.getState();
    expect(state.activeTaskId).toBe('t-home-1');
    expect(state.currentStepId).toBe('s-h1-1');
    expect(state.timerState).toBe('idle');
    expect(state.timeRemainingSeconds).toBe(60); // 1 min for s-h1-1
  });

  it('tests completing steps one by one', () => {
    const store = useMicroTasksStore.getState();
    store.startTask('t-home-1');
    
    // complete first step
    useMicroTasksStore.getState().setStepStatus('s-h1-1', 'completed');
    
    // go to next step
    useMicroTasksStore.getState().nextStep();
    
    const state = useMicroTasksStore.getState();
    expect(state.currentStepId).toBe('s-h1-2');
    expect(state.timeRemainingSeconds).toBe(120); // 2 mins for s-h1-2
    
    const task = state.tasks.find(t => t.id === 't-home-1');
    expect(task?.steps[0].status).toBe('completed');
  });

  it('tests step timer start/pause/complete', () => {
    const store = useMicroTasksStore.getState();
    
    store.setTimerState('running');
    expect(useMicroTasksStore.getState().timerState).toBe('running');
    
    store.resetTimer(5);
    expect(useMicroTasksStore.getState().timeRemainingSeconds).toBe(5);
    expect(useMicroTasksStore.getState().timerState).toBe('idle');
    
    useMicroTasksStore.getState().setTimerState('running');
    useMicroTasksStore.getState().tick();
    expect(useMicroTasksStore.getState().timeRemainingSeconds).toBe(4);
    
    useMicroTasksStore.getState().setTimerState('paused');
    expect(useMicroTasksStore.getState().timerState).toBe('paused');
  });

  it('tests completion celebration state when timer ticks to zero', () => {
    const store = useMicroTasksStore.getState();
    store.resetTimer(1);
    store.setTimerState('running');
    
    store.tick();
    const state = useMicroTasksStore.getState();
    expect(state.timeRemainingSeconds).toBe(0);
    expect(state.timerState).toBe('finished');
  });

  it('tests completion celebration state when nextStep finishes task', () => {
    const store = useMicroTasksStore.getState();
    store.startTask('t-work-4'); // 4 steps
    
    useMicroTasksStore.getState().nextStep(); // to s-w4-2
    useMicroTasksStore.getState().nextStep(); // to s-w4-3
    useMicroTasksStore.getState().nextStep(); // to s-w4-4
    useMicroTasksStore.getState().nextStep(); // Finish
    
    const state = useMicroTasksStore.getState();
    expect(state.currentStepId).toBeNull();
    expect(state.activeTaskId).toBeNull();
    expect(state.timerState).toBe('finished');
  });

  it('tests localStorage persistence', () => {
    const store = useMicroTasksStore.getState();
    store.startTask('t-work-2');
    
    // Check if it was persisted to localStorage
    const storedState = JSON.parse(localStorage.getItem('ann_micro_tasks') || '{}');
    expect(storedState.state.activeTaskId).toBe('t-work-2');
    expect(storedState.state.currentStepId).toBe('s-w2-1');
  });

  it('tests saveCustomTemplate', () => {
    const store = useMicroTasksStore.getState();
    const newTemplate = { id: 'c-1', title: 'Custom', steps: [] };
    store.saveCustomTemplate(newTemplate);
    expect(useMicroTasksStore.getState().userTemplates).toHaveLength(1);
    expect(useMicroTasksStore.getState().userTemplates[0].title).toBe('Custom');
  });

  it('tests addStepToActiveTask', () => {
    const store = useMicroTasksStore.getState();
    store.startTask('t-home-1');
    const initialStepsCount = useMicroTasksStore.getState().tasks.find(t => t.id === 't-home-1')?.steps.length || 0;
    
    useMicroTasksStore.getState().addStepToActiveTask('Nowy krok');
    const updatedTask = useMicroTasksStore.getState().tasks.find(t => t.id === 't-home-1');
    expect(updatedTask?.steps).toHaveLength(initialStepsCount + 1);
    expect(updatedTask?.steps[updatedTask.steps.length - 1].title).toBe('Nowy krok');
  });

  it('tests editActiveTaskStep', () => {
    const store = useMicroTasksStore.getState();
    store.startTask('t-home-1');
    
    useMicroTasksStore.getState().editActiveTaskStep('s-h1-1', 'Zmieniony krok');
    const updatedTask = useMicroTasksStore.getState().tasks.find(t => t.id === 't-home-1');
    expect(updatedTask?.steps.find(s => s.id === 's-h1-1')?.title).toBe('Zmieniony krok');
  });

  it('tests removeStepFromActiveTask', () => {
    const store = useMicroTasksStore.getState();
    store.startTask('t-home-1');
    const initialStepsCount = useMicroTasksStore.getState().tasks.find(t => t.id === 't-home-1')?.steps.length || 0;
    
    useMicroTasksStore.getState().removeStepFromActiveTask('s-h1-1');
    const updatedTask = useMicroTasksStore.getState().tasks.find(t => t.id === 't-home-1');
    expect(updatedTask?.steps).toHaveLength(initialStepsCount - 1);
    expect(updatedTask?.steps.find(s => s.id === 's-h1-1')).toBeUndefined();
  });

  it('tests recordTaskCompletion', () => {
    const store = useMicroTasksStore.getState();
    const task = store.tasks.find(t => t.id === 't-home-1');
    if (task) {
      store.recordTaskCompletion(task);
      const history = useMicroTasksStore.getState().taskHistory;
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe('Sprzątanie kuchni po gotowaniu');
      expect(history[0].category).toBe('home');
      expect(history[0].stepsCount).toBe(5);
    }
  });
});
