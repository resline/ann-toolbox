import { Clock, CircleDot, Sparkles, Footprints, House } from '../lib/icons';
import type { LucideIcon } from '../lib/icons';
import { modules, teraz } from '../copy';

/** Klucz modułu ustawiany na powłoce jako [data-module] — steruje akcentem. */
export type ModuleKey = 'czas' | 'skupienie' | 'energia' | 'start';

export interface RouteDef {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  /** Identyfikator narzędzia w rejestrze. `null` dla ekranu startowego. */
  toolId: string | null;
  module: ModuleKey | null;
}

/**
 * Ścieżki są po polsku, bo są widoczne w pasku adresu i w skrótach na ekranie
 * głównym telefonu. Identyfikatory narzędzi zostają angielskie — to klucze
 * rejestru i zapisu, a zmiana nazw produktowych nie może ich ruszać.
 */
export const ROUTES: RouteDef[] = [
  { id: 'teraz', path: '/', label: teraz.title, icon: House, toolId: null, module: null },
  { id: 'czas', path: '/czas', label: modules.czas.title, icon: Clock, toolId: 'speaking-clock', module: 'czas' },
  { id: 'skupienie', path: '/skupienie', label: modules.skupienie.title, icon: CircleDot, toolId: 'visual-timer', module: 'skupienie' },
  { id: 'energia', path: '/energia', label: modules.energia.title, icon: Sparkles, toolId: 'dopamine-menu', module: 'energia' },
  { id: 'start', path: '/start', label: modules.start.title, icon: Footprints, toolId: 'micro-tasks', module: 'start' },
];

export const HOME_ROUTE = ROUTES[0];

export function routeByPath(path: string): RouteDef {
  const normalized = path.replace(/\/+$/, '') || '/';
  return ROUTES.find((r) => r.path === normalized) ?? HOME_ROUTE;
}

export function routeByToolId(toolId: string): RouteDef | undefined {
  return ROUTES.find((r) => r.toolId === toolId);
}
