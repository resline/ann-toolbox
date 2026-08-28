import { Clock, CircleDot, Sparkles, Footprints } from '../lib/icons';
import { modules } from '../copy';
import type { ToolCategory, ToolCategoryId, ToolModule } from './types';
import { SpeakingClockModule } from '../modules/speaking-clock/SpeakingClockModule';
import { VisualTimerModule } from '../modules/visual-timer/components/VisualTimerModule';
import { DopamineDashboard } from '../modules/dopamine-menu/components/DopamineDashboard';
import { MicroTasksModule } from '../modules/micro-tasks/components/MicroTasksModule';

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
    title: modules.czas.title,
    subtitle: modules.czas.purpose,
    description: modules.czas.purpose,
    icon: Clock,
    category: 'time',
    status: 'available',
    component: SpeakingClockModule,
  },
  {
    id: 'visual-timer',
    title: modules.skupienie.title,
    subtitle: modules.skupienie.purpose,
    description: modules.skupienie.purpose,
    icon: CircleDot,
    category: 'time',
    status: 'available',
    component: VisualTimerModule,
  },
  {
    id: 'dopamine-menu',
    title: modules.energia.title,
    subtitle: modules.energia.purpose,
    description: modules.energia.purpose,
    icon: Sparkles,
    category: 'wellbeing',
    status: 'available',
    component: DopamineDashboard,
  },
  {
    id: 'micro-tasks',
    title: modules.start.title,
    subtitle: modules.start.purpose,
    description: modules.start.purpose,
    icon: Footprints,
    category: 'tasks',
    status: 'available',
    component: MicroTasksModule,
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
