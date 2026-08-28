/** Identyfikatory testowe modułu Skupienie. Nigdy nie wpisuj ich w testach wprost. */
export const skupienieIds = {
  root: 'skupienie-root',

  modeTabs: 'skupienie-mode-tabs',
  modeTab: (mode: string) => `skupienie-mode-${mode}`,

  /** Wybór presetu istnieje w dwóch miejscach naraz (ekran i arkusz),
   *  więc identyfikator musi nieść informację, w którym z nich jesteśmy. */
  presetPicker: (scope: string) => `skupienie-presets-${scope}`,
  presetCard: (scope: string, presetId: string) => `skupienie-preset-${scope}-${presetId}`,
  presetStart: (scope: string, presetId: string) => `skupienie-preset-start-${scope}-${presetId}`,
  presetBreakdown: (scope: string, presetId: string) => `skupienie-preset-plan-${scope}-${presetId}`,

  disc: 'skupienie-disc',
  discPhase: 'skupienie-disc-phase',
  discValue: 'skupienie-disc-value',
  discTotal: 'skupienie-disc-total',
  phaseHint: 'skupienie-phase-hint',
  statusBadge: 'skupienie-status',

  primaryAction: 'skupienie-primary-action',
  stopAction: 'skupienie-stop',
  skipAction: 'skupienie-skip',
  settingsAction: 'skupienie-settings',

  timeline: 'skupienie-timeline',
  timelinePhase: (phase: string) => `skupienie-timeline-${phase}`,

  breathing: 'skupienie-breathing',
  breathingTechnique: (technique: string) => `skupienie-breathing-${technique}`,
  breathingToggle: 'skupienie-breathing-toggle',
  breathingPhase: 'skupienie-breathing-phase',
  breathingCount: 'skupienie-breathing-count',

  ambience: 'skupienie-ambience',
  ambienceSound: (sound: string) => `skupienie-sound-${sound}`,
  ambienceVolume: 'skupienie-volume',
  ambienceNotice: 'skupienie-ambience-notice',

  sheet: 'skupienie-sheet',
  autoSoundSwitch: 'skupienie-auto-sound',
} as const;
