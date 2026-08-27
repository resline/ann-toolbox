import { describe, it, expect, beforeEach } from 'vitest';
import { Clock } from 'lucide-react';
import {
  registerTool,
  getTools,
  getToolById,
  getToolsByCategory,
  getAvailableTools,
  resetRegistry,
  TOOL_CATEGORIES,
} from './registry';
import { ToolModule } from './types';

describe('Tool Registry', () => {
  beforeEach(() => {
    resetRegistry();
  });

  describe('Default tools', () => {
    it('initializes with default tools', () => {
      const tools = getTools();
      expect(tools.length).toBeGreaterThanOrEqual(4);

      const ids = tools.map((t) => t.id);
      expect(ids).toContain('speaking-clock');
      expect(ids).toContain('visual-timer');
      expect(ids).toContain('dopamine-menu');
      expect(ids).toContain('micro-tasks');
    });

    it('has speaking-clock configured as available with correct metadata', () => {
      const clock = getToolById('speaking-clock');
      expect(clock).toBeDefined();
      expect(clock?.title).toBe('Głos Czasu');
      expect(clock?.subtitle).toBe('Mówiący zegar w tle');
      expect(clock?.category).toBe('time');
      expect(clock?.status).toBe('available');
      expect(clock?.icon).toBeDefined();
      expect(clock?.description).toBeTruthy();
    });

    it('has planned tools configured as coming_soon', () => {
      const visualTimer = getToolById('visual-timer');
      expect(visualTimer).toBeDefined();
      expect(visualTimer?.title).toBe('Wizualny Timer');
      expect(visualTimer?.subtitle).toBe('Upływ czasu w kolorach');
      expect(visualTimer?.category).toBe('time');
      expect(visualTimer?.status).toBe('coming_soon');

      const dopamineMenu = getToolById('dopamine-menu');
      expect(dopamineMenu).toBeDefined();
      expect(dopamineMenu?.title).toBe('Menu Dopaminowe');
      expect(dopamineMenu?.subtitle).toBe('Zasoby energii i mikronagrody');
      expect(dopamineMenu?.category).toBe('wellbeing');
      expect(dopamineMenu?.status).toBe('coming_soon');

      const microTasks = getToolById('micro-tasks');
      expect(microTasks).toBeDefined();
      expect(microTasks?.title).toBe('Mikro-Zadania');
      expect(microTasks?.subtitle).toBe('Krok po kroku bez oporu');
      expect(microTasks?.category).toBe('tasks');
      expect(microTasks?.status).toBe('coming_soon');
    });
  });

  describe('Querying tools', () => {
    it('getToolById returns undefined for non-existent id', () => {
      expect(getToolById('unknown-tool')).toBeUndefined();
    });

    it('getToolsByCategory filters tools correctly', () => {
      const timeTools = getToolsByCategory('time');
      expect(timeTools.length).toBeGreaterThanOrEqual(2);
      expect(timeTools.every((t) => t.category === 'time')).toBe(true);

      const wellbeingTools = getToolsByCategory('wellbeing');
      expect(wellbeingTools.some((t) => t.id === 'dopamine-menu')).toBe(true);
      expect(wellbeingTools.every((t) => t.category === 'wellbeing')).toBe(true);

      const taskTools = getToolsByCategory('tasks');
      expect(taskTools.some((t) => t.id === 'micro-tasks')).toBe(true);
      expect(taskTools.every((t) => t.category === 'tasks')).toBe(true);

      const focusTools = getToolsByCategory('focus');
      expect(Array.isArray(focusTools)).toBe(true);
    });

    it('getAvailableTools returns only available tools', () => {
      const available = getAvailableTools();
      expect(available.every((t) => t.status === 'available')).toBe(true);
      expect(available.some((t) => t.id === 'speaking-clock')).toBe(true);
      expect(available.some((t) => t.id === 'visual-timer')).toBe(false);
    });
  });

  describe('Registering tools', () => {
    it('allows registering a new tool', () => {
      const customTool: ToolModule = {
        id: 'custom-tool',
        title: 'Moje Narzędzie',
        subtitle: 'Testowe narzędzie',
        description: 'Opis narzędzia testowego',
        icon: Clock,
        category: 'focus',
        status: 'available',
        badge: 'Nowość',
      };

      registerTool(customTool);
      expect(getToolById('custom-tool')).toEqual(customTool);
      expect(getToolsByCategory('focus')).toContainEqual(customTool);
    });

    it('updates an existing tool when registered with the same id', () => {
      const updatedClock: ToolModule = {
        ...getToolById('speaking-clock')!,
        subtitle: 'Zaktualizowany podtytuł',
        badge: 'V2',
      };

      registerTool(updatedClock);
      const retrieved = getToolById('speaking-clock');
      expect(retrieved?.subtitle).toBe('Zaktualizowany podtytuł');
      expect(retrieved?.badge).toBe('V2');
    });
  });

  describe('TOOL_CATEGORIES metadata', () => {
    it('defines all 4 tool categories with labels and descriptions', () => {
      expect(TOOL_CATEGORIES).toHaveLength(4);
      const catIds = TOOL_CATEGORIES.map((c) => c.id);
      expect(catIds).toContain('time');
      expect(catIds).toContain('focus');
      expect(catIds).toContain('wellbeing');
      expect(catIds).toContain('tasks');

      TOOL_CATEGORIES.forEach((cat) => {
        expect(cat.label).toBeTruthy();
        expect(cat.description).toBeTruthy();
      });
    });
  });
});
