/** Identyfikatory testowe modułu Czas. Nigdy nie wpisuj ich w testach wprost. */
export const czasIds = {
  disc: 'czas-disc',
  discSector: 'czas-disc-sector',
  discFull: 'czas-disc-full',
  discTick: 'czas-disc-tick',
  discNumbers: 'czas-disc-numbers',
  discPointer: 'czas-disc-pointer',
  discValue: 'czas-disc-value',
  discLabel: 'czas-disc-label',

  modeTabs: 'czas-mode-tabs',
  modeTab: (mode: string) => `czas-mode-${mode}`,

  primaryAction: 'czas-primary-action',
  secondaryAction: 'czas-secondary-action',
  settingsRow: 'czas-settings-row',
  quickAdjust: (minutes: number) => `czas-adjust-${minutes > 0 ? 'plus' : 'minus'}${Math.abs(minutes)}`,
  intervalPreset: (minutes: number) => `czas-interval-${minutes}`,

  noVoiceNotice: 'czas-no-voice',
  speechFailure: 'czas-speech-failure',
  retryVoice: 'czas-retry-voice',
  statusBadge: 'czas-status',

  sheet: 'czas-sheet',
  sheetTab: (tab: string) => `czas-sheet-tab-${tab}`,

  departureTime: 'czas-departure-time',
  departureOffset: (minutes: number) => `czas-departure-offset-${minutes}`,
  departurePreset: (index: number) => `czas-departure-preset-${index}`,
  departureCustom: 'czas-departure-custom',
  departureCustomButton: 'czas-departure-custom-button',
  cadenceSmart: 'czas-cadence-smart',
  cadenceFixed: (minutes: number) => `czas-cadence-${minutes}`,

  focusLength: (minutes: number) => `czas-focus-${minutes}`,
} as const;
