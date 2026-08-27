import { Volume2, Timer, Sparkles, ListTodo } from 'lucide-react';
import type { ToolCategory, ToolCategoryId, ToolModule } from './types';
import { SpeakingClockModule } from '../modules/speaking-clock/SpeakingClockModule';

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'time',
    label: 'Czas i Rytm',
    description: 'Narzędzia ułatwiające orientację w czasie i walkę ze ślepotą czasową',
  },
  {
    id: 'focus',
    label: 'Skupienie',
    description: 'Wsparcie w wejściu i utrzymaniu stanu flow bez przeciążenia',
  },
  {
    id: 'wellbeing',
    label: 'Dobrostan',
    description: 'Regulacja układu nerwowego, dopamina i dbanie o siebie',
  },
  {
    id: 'tasks',
    label: 'Zadania',
    description: 'Przełamywanie prokrastynacji i paraliżu decyzyjnego',
  },
];

export const DEFAULT_TOOLS: ToolModule[] = [
  {
    id: 'speaking-clock',
    title: 'Kotwica Czasu',
    subtitle: 'Mówiący zegar, odliczanie i Time Timer',
    description:
      'Dyskretny mówiący zegar, odliczanie do wyjścia z domu oraz wizualny Time Timer dla wsparcia percepcji czasu.',
    icon: Volume2,
    category: 'time',
    status: 'available',
    badge: 'Aktywny',
    component: SpeakingClockModule,
  },
  {
    id: 'visual-timer',
    title: 'Wizualny Timer',
    subtitle: 'Upływ czasu w kolorach',
    description:
      'Kolorowy zegar wizualny ułatwiający poczucie upływającego czasu bez presji i stresu.',
    icon: Timer,
    category: 'time',
    status: 'coming_soon',
    badge: 'Wkrótce',
  },
  {
    id: 'dopamine-menu',
    title: 'Menu Dopaminowe',
    subtitle: 'Zasoby energii i mikronagrody',
    description:
      'Osobiste menu aktywności podnoszących poziom dopaminy: przystawki, dania główne, deski przekąsek.',
    icon: Sparkles,
    category: 'wellbeing',
    status: 'coming_soon',
    badge: 'Wkrótce',
  },
  {
    id: 'micro-tasks',
    title: 'Mikro-Zadania',
    subtitle: 'Krok po kroku bez oporu',
    description:
      'Rozbijanie paraliżujących zadań na mikrokroki wymagające poniżej 2 minut zaangażowania.',
    icon: ListTodo,
    category: 'tasks',
    status: 'coming_soon',
    badge: 'Wkrótce',
  },
];

// Internal registry map
const registry = new Map<string, ToolModule>();

// Initialize default tools
export function initDefaultTools(): void {
  registry.clear();
  for (const tool of DEFAULT_TOOLS) {
    registry.set(tool.id, { ...tool });
  }
}

// Initialize on module load
initDefaultTools();

/**
 * Register or update a tool module in the registry.
 */
export function registerTool(tool: ToolModule): void {
  registry.set(tool.id, tool);
}

/**
 * Get all registered tools.
 */
export function getTools(): ToolModule[] {
  return Array.from(registry.values());
}

/**
 * Get a tool by its unique ID.
 */
export function getToolById(id: string): ToolModule | undefined {
  return registry.get(id);
}

/**
 * Get tools belonging to a specific category.
 */
export function getToolsByCategory(category: ToolCategoryId): ToolModule[] {
  return Array.from(registry.values()).filter((t) => t.category === category);
}

/**
 * Get all available (non-coming_soon) tools.
 */
export function getAvailableTools(): ToolModule[] {
  return Array.from(registry.values()).filter((t) => t.status === 'available');
}

/**
 * Reset registry back to initial default tools (useful for tests).
 */
export function resetRegistry(): void {
  initDefaultTools();
}
