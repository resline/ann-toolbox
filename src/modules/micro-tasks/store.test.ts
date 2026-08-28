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

/**
 * Nowe akcje. Osobny blok, bo powyższe testy zostają dokładnie takie, jakie były —
 * po przepięciu widoku na store stały się jego kontraktem.
 */
describe('startAdHocTask', () => {
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

  it('dokłada zadanie do tasks i od razu je uruchamia', () => {
    const id = useMicroTasksStore.getState().startAdHocTask('Zadanie doraźne', ['Krok A', 'Krok B']);

    const state = useMicroTasksStore.getState();
    const task = state.tasks.find(t => t.id === id);

    expect(id).not.toBe('');
    expect(task).toBeDefined();
    expect(task!.title).toBe('Zadanie doraźne');
    expect(task!.steps.map(s => s.title)).toEqual(['Krok A', 'Krok B']);
    expect(state.activeTaskId).toBe(id);
    expect(state.currentStepId).toBe(task!.steps[0].id);
    expect(state.timerState).toBe('idle');
  });

  it('pomija puste kroki i nic nie robi, gdy nie zostaje żaden', () => {
    const id = useMicroTasksStore.getState().startAdHocTask('Puste', ['  ', '']);
    expect(id).toBe('');
    expect(useMicroTasksStore.getState().activeTaskId).toBeNull();

    const withOne = useMicroTasksStore.getState().startAdHocTask('Jeden krok', ['  ', 'Jedyny krok']);
    const task = useMicroTasksStore.getState().tasks.find(t => t.id === withOne);
    expect(task!.steps).toHaveLength(1);
    expect(task!.steps[0].title).toBe('Jedyny krok');
  });

  it('trafia do localStorage razem z postępem kroków', () => {
    const id = useMicroTasksStore.getState().startAdHocTask('Zapisane', ['Raz', 'Dwa']);
    useMicroTasksStore.getState().nextStep();

    const stored = JSON.parse(localStorage.getItem('ann_micro_tasks') || '{}');
    const persisted = stored.state.tasks.find((t: { id: string }) => t.id === id);

    expect(stored.state.activeTaskId).toBe(id);
    expect(persisted.steps[0].status).toBe('completed');
    expect(stored.state.currentStepId).toBe(persisted.steps[1].id);
  });

  it('nie zostawia po sobie zamkniętych zadań doraźnych', () => {
    const before = useMicroTasksStore.getState().tasks.length;

    // pierwsze przeklikane do końca — nie ma po co wracać
    useMicroTasksStore.getState().startAdHocTask('Pierwsze', ['Krok']);
    useMicroTasksStore.getState().nextStep();

    useMicroTasksStore.getState().startAdHocTask('Drugie', ['Krok']);
    useMicroTasksStore.getState().nextStep();

    useMicroTasksStore.getState().startAdHocTask('Trzecie', ['Krok']);

    const tasks = useMicroTasksStore.getState().tasks;
    expect(tasks).toHaveLength(before + 1);
    expect(tasks[tasks.length - 1].title).toBe('Trzecie');
  });

  it('nie kasuje odłożonego zadania, gdy powstaje kolejne', () => {
    const parked = useMicroTasksStore.getState().startAdHocTask('Odłożone', ['Krok A', 'Krok B']);
    useMicroTasksStore.getState().abandonTask();

    useMicroTasksStore.getState().startAdHocTask('Kolejne', ['Krok']);

    const still = useMicroTasksStore.getState().tasks.find(t => t.id === parked);
    expect(still).toBeDefined();
    expect(still!.steps).toHaveLength(2);
  });
});

describe('abandonTask', () => {
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

  it('wypuszcza z zadania bez wpisu do historii', () => {
    useMicroTasksStore.getState().startTask('t-home-1');
    useMicroTasksStore.getState().abandonTask();

    const state = useMicroTasksStore.getState();
    expect(state.activeTaskId).toBeNull();
    expect(state.currentStepId).toBeNull();
    expect(state.taskHistory).toHaveLength(0);
    expect(state.tasks.find(t => t.id === 't-home-1')).toBeDefined();
  });

  it('NIE KASUJE odłożonego zadania doraźnego — potwierdzenie obiecuje powrót', () => {
    const id = useMicroTasksStore.getState().startAdHocTask('Doraźne', ['Krok A', 'Krok B']);
    useMicroTasksStore.getState().nextStep();

    useMicroTasksStore.getState().abandonTask();

    const parked = useMicroTasksStore.getState().tasks.find(t => t.id === id);
    expect(parked).toBeDefined();
    expect(parked!.steps.map(s => s.title)).toEqual(['Krok A', 'Krok B']);
    // „Kroki wrócą do stanu wyjściowego"
    expect(parked!.steps.every(s => s.status === 'pending')).toBe(true);

    // i da się je zacząć od nowa
    useMicroTasksStore.getState().startTask(id);
    expect(useMicroTasksStore.getState().activeTaskId).toBe(id);
  });
});

describe('discardTask', () => {
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

  it('usuwa wskazane zadanie razem z krokami', () => {
    const before = useMicroTasksStore.getState().tasks.length;
    const id = useMicroTasksStore.getState().startAdHocTask('Do wyrzucenia', ['Krok']);
    useMicroTasksStore.getState().abandonTask();

    useMicroTasksStore.getState().discardTask(id);

    const state = useMicroTasksStore.getState();
    expect(state.tasks).toHaveLength(before);
    expect(state.tasks.find(t => t.id === id)).toBeUndefined();
  });

  it('wypuszcza z zadania, gdy usuwane jest właśnie to w toku', () => {
    const id = useMicroTasksStore.getState().startAdHocTask('W toku', ['Krok']);

    useMicroTasksStore.getState().discardTask(id);

    const state = useMicroTasksStore.getState();
    expect(state.activeTaskId).toBeNull();
    expect(state.currentStepId).toBeNull();
    expect(state.tasks.find(t => t.id === id)).toBeUndefined();
  });
});

/**
 * Historia to dowód rzeczowy na realny postęp. Ten blok pilnuje, żeby dało się
 * ją napełnić tylko robieniem kroków, a nie klikaniem „pomiń".
 */
describe('finishTask a historia', () => {
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

  it('zapisuje zadanie, w którym wszystkie kroki są zrobione', () => {
    const id = useMicroTasksStore.getState().startAdHocTask('Zrobione', ['Raz', 'Dwa']);
    const task = useMicroTasksStore.getState().tasks.find(t => t.id === id)!;

    useMicroTasksStore.getState().nextStep();
    useMicroTasksStore.getState().nextStep();

    const history = useMicroTasksStore.getState().taskHistory;
    expect(history).toHaveLength(1);
    expect(history[0].title).toBe('Zrobione');
    expect(history[0].stepsCount).toBe(task.steps.length);
  });

  it('NIE zapisuje zadania, w którym choć jeden krok został pominięty', () => {
    const id = useMicroTasksStore.getState().startAdHocTask('Pominięte', ['Raz', 'Dwa']);
    const task = useMicroTasksStore.getState().tasks.find(t => t.id === id)!;

    useMicroTasksStore.getState().setStepStatus(task.steps[0].id, 'skipped');
    useMicroTasksStore.getState().nextStep();
    useMicroTasksStore.getState().nextStep();

    expect(useMicroTasksStore.getState().activeTaskId).toBeNull();
    expect(useMicroTasksStore.getState().taskHistory).toHaveLength(0);
  });
});

describe('startTask dla szablonu użytkowniczki', () => {
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

  it('pozwala przejść kroki szablonu zapisanego przez użytkowniczkę', () => {
    useMicroTasksStore.getState().saveCustomTemplate({
      id: 'c-flow',
      title: 'Mój zestaw',
      isCustomTemplate: true,
      steps: [
        { id: 'c-flow-1', title: 'Raz', status: 'pending', estimatedMinutes: 2 },
        { id: 'c-flow-2', title: 'Dwa', status: 'pending', estimatedMinutes: 2 }
      ]
    });

    useMicroTasksStore.getState().startTask('c-flow');
    expect(useMicroTasksStore.getState().currentStepId).toBe('c-flow-1');

    useMicroTasksStore.getState().nextStep();
    expect(useMicroTasksStore.getState().currentStepId).toBe('c-flow-2');
  });
});
