import { describe, it, expect, beforeEach } from 'vitest';
import { useDopamineMenuStore } from './store';
import { DEFAULT_DOPAMINE_MENU } from './presets';
import { DopamineItem } from './types';

describe('DopamineMenu Store', () => {
  beforeEach(() => {
    useDopamineMenuStore.getState().resetToDefaults();
    localStorage.clear();
  });

  it('loads default items and categories', () => {
    const state = useDopamineMenuStore.getState();
    expect(state.items).toEqual(DEFAULT_DOPAMINE_MENU);
    expect(state.items.length).toBeGreaterThan(0);
    
    const categories = new Set(state.items.map(i => i.category));
    expect(categories.has('appetizer')).toBe(true);
    expect(categories.has('entree')).toBe(true);
  });

  it('filters by energy level', () => {
    const state = useDopamineMenuStore.getState();
    expect(state.energyFilter).toBe('all');
    
    state.setEnergyFilter('low');
    expect(useDopamineMenuStore.getState().energyFilter).toBe('low');
  });

  it('adds custom dopamine items', () => {
    const state = useDopamineMenuStore.getState();
    const newItem: DopamineItem = {
      id: 'custom-1',
      title: 'Custom item',
      category: 'special',
      energyRequired: 'low'
    };
    
    state.addItem(newItem);
    expect(useDopamineMenuStore.getState().items).toContainEqual(newItem);
  });

  it('toggles/pins/selects items', () => {
    const state = useDopamineMenuStore.getState();
    const firstItemId = state.items[0].id;
    
    state.togglePin(firstItemId);
    expect(useDopamineMenuStore.getState().items[0].isPinned).toBe(true);
    
    state.togglePin(firstItemId);
    expect(useDopamineMenuStore.getState().items[0].isPinned).toBe(false);

    state.selectItem(firstItemId);
    expect(useDopamineMenuStore.getState().selectedItemId).toBe(firstItemId);
  });

  it('rolls random dopamine roulette', () => {
    const state = useDopamineMenuStore.getState();
    const result = state.rollRoulette();
    expect(result).not.toBeNull();
    expect(state.items.some(i => i.id === result?.id)).toBe(true);
    expect(useDopamineMenuStore.getState().selectedItemId).toBe(result?.id);
  });

  it('persists to localStorage', () => {
    const newItem: DopamineItem = {
      id: 'custom-persisted',
      title: 'Persisted item',
      category: 'dessert',
      energyRequired: 'high'
    };
    
    useDopamineMenuStore.getState().addItem(newItem);
    
    const storedState = JSON.parse(localStorage.getItem('ann_dopamine_menu') || '{}');
    expect(storedState.state.items.some((i: any) => i.id === 'custom-persisted')).toBe(true);
  });
});
