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
    });
    localStorage.clear();
  });

  it('loads task templates (Sprzątanie, Mail, Trening, Projekt)', () => {
    const { tasks } = useMicroTasksStore.getState();
    expect(tasks).toHaveLength(4);
    expect(tasks.map(t => t.title)).toContain('Sprzątanie pokoju');
    expect(tasks.map(t => t.title)).toContain('Rozpoczęcie trudnego maila');
    expect(tasks.map(t => t.title)).toContain('Zebranie się na trening');
    expect(tasks.map(t => t.title)).toContain('Praca nad projektem');
  });

  it('tests task decomposition into sub-steps', () => {
    const { tasks } = useMicroTasksStore.getState();
    const task = tasks.find(t => t.title === 'Sprzątanie pokoju');
    expect(task).toBeDefined();
    expect(task!.steps.length).toBeGreaterThan(1);
    expect(task!.steps[0].title).toBe('Weź worek na śmieci');
  });

  it('starts a task and initializes single-step progression', () => {
    const { startTask } = useMicroTasksStore.getState();
    startTask('t-1');
    const state = useMicroTasksStore.getState();
    expect(state.activeTaskId).toBe('t-1');
    expect(state.currentStepId).toBe('s-1-1');
    expect(state.timerState).toBe('idle');
    expect(state.timeRemainingSeconds).toBe(60); // 1 min for s-1-1
  });

  it('tests completing steps one by one', () => {
    const store = useMicroTasksStore.getState();
    store.startTask('t-1');
    
    // complete first step
    useMicroTasksStore.getState().setStepStatus('s-1-1', 'completed');
    
    // go to next step
    useMicroTasksStore.getState().nextStep();
    
    const state = useMicroTasksStore.getState();
    expect(state.currentStepId).toBe('s-1-2');
    expect(state.timeRemainingSeconds).toBe(120); // 2 mins for s-1-2
    
    const task = state.tasks.find(t => t.id === 't-1');
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
    store.startTask('t-4'); // 4 steps
    
    useMicroTasksStore.getState().nextStep(); // to s-4-2
    useMicroTasksStore.getState().nextStep(); // to s-4-3
    useMicroTasksStore.getState().nextStep(); // to s-4-4
    useMicroTasksStore.getState().nextStep(); // Finish
    
    const state = useMicroTasksStore.getState();
    expect(state.currentStepId).toBeNull();
    expect(state.activeTaskId).toBeNull();
    expect(state.timerState).toBe('finished');
  });

  it('tests localStorage persistence', () => {
    const store = useMicroTasksStore.getState();
    store.startTask('t-2');
    
    // Check if it was persisted to localStorage
    const storedState = JSON.parse(localStorage.getItem('ann_micro_tasks') || '{}');
    expect(storedState.state.activeTaskId).toBe('t-2');
    expect(storedState.state.currentStepId).toBe('s-2-1');
  });
});
