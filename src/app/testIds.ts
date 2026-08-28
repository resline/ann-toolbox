/**
 * Identyfikatory testowe powłoki.
 *
 * Testy nigdy nie wpisują tych napisów wprost — przemianowanie ma być
 * refaktorem, a nie wyszukiwaniem po repozytorium.
 */
export const shellIds = {
  root: 'shell-root',
  header: 'shell-header',
  headerTitle: 'shell-header-title',
  settingsButton: 'shell-settings',
  tabBar: 'shell-tabbar',
  tab: (routeId: string) => `shell-tab-${routeId}`,
  main: 'shell-main',
  installBanner: 'pwa-install-banner',
  installAccept: 'pwa-install-accept',
  installDismiss: 'pwa-install-dismiss',
} as const;

export const terazIds = {
  greeting: 'teraz-greeting',
  entry: (toolId: string) => `teraz-entry-${toolId}`,
  entryState: (toolId: string) => `teraz-entry-state-${toolId}`,
} as const;
