/** Identyfikatory testowe modułu Start. Nigdy nie wpisuj ich w testach wprost. */
export const startIds = {
  /* ekran startowy */
  home: 'start-home',
  catalogButton: 'start-catalog-open',
  historyButton: 'start-history-open',
  ownTaskButton: 'start-own-task',
  templateCard: (taskId: string) => `start-template-${taskId}`,
  templateDelete: (taskId: string) => `start-template-delete-${taskId}`,
  parked: 'start-parked',
  parkedDiscard: (taskId: string) => `start-parked-discard-${taskId}`,

  /* widok skupienia */
  focus: 'start-focus',
  focusTask: 'start-focus-task',
  focusStep: 'start-focus-step',
  focusBeads: 'start-focus-beads',
  focusDone: 'start-focus-done',
  focusSkip: 'start-focus-skip',
  focusShowList: 'start-focus-show-list',
  focusAddStep: 'start-focus-add-step',
  focusAddInput: 'start-focus-add-input',
  focusAddSubmit: 'start-focus-add-submit',
  focusAddCancel: 'start-focus-add-cancel',
  focusSaveTemplate: 'start-focus-save-template',
  focusSavedNotice: 'start-focus-saved',

  /* pierścień oporu */
  timerValue: 'start-timer-value',
  timerToggle: 'start-timer-toggle',
  timerNote: 'start-timer-note',

  /* lista kroków */
  list: 'start-list',
  listProgress: 'start-list-progress',
  listFocusView: 'start-list-focus-view',
  listAbandon: 'start-list-abandon',
  step: (stepId: string) => `start-step-${stepId}`,
  stepDone: (stepId: string) => `start-step-done-${stepId}`,

  /* arkusz rozbijania zadania */
  decomposer: 'start-decomposer',
  decomposerTitleInput: 'start-decomposer-title',
  decomposerNext: 'start-decomposer-next',
  decomposerBack: 'start-decomposer-back',
  decomposerResistance: 'start-decomposer-resistance',
  decomposerResistanceNote: 'start-decomposer-resistance-note',
  decomposerSuggest: 'start-decomposer-suggest',
  decomposerStepInput: 'start-decomposer-step-input',
  decomposerStepAdd: 'start-decomposer-step-add',
  decomposerStep: (index: number) => `start-decomposer-step-${index}`,
  decomposerStepRemove: (index: number) => `start-decomposer-step-remove-${index}`,
  decomposerBegin: 'start-decomposer-begin',

  /* arkusz katalogu */
  catalog: 'start-catalog',
  catalogSearch: 'start-catalog-search',
  catalogFilter: (value: string) => `start-catalog-filter-${value}`,
  catalogItem: (taskId: string) => `start-catalog-item-${taskId}`,
  catalogRun: (taskId: string) => `start-catalog-run-${taskId}`,
  catalogEmpty: 'start-catalog-empty',

  /* arkusz historii */
  history: 'start-history',
  historyCount: 'start-history-count',
  historyEntry: (entryId: string) => `start-history-entry-${entryId}`,
  historyEmpty: 'start-history-empty',

  /* świętowanie */
  celebration: 'start-celebration',
} as const;
