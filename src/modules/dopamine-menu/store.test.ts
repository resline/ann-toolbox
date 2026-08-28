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

  it('toggles favorite status of an item', () => {
    const state = useDopamineMenuStore.getState();
    const firstItemId = state.items[0].id;

    state.toggleFavorite(firstItemId);
    expect(useDopamineMenuStore.getState().items[0].isFavorite).toBe(true);

    state.toggleFavorite(firstItemId);
    expect(useDopamineMenuStore.getState().items[0].isFavorite).toBe(false);
  });

  it('completes an item, updating count and adding to completedToday', () => {
    const state = useDopamineMenuStore.getState();
    const firstItem = state.items[0];
    const initialCount = firstItem.completedCount || 0;

    state.completeItem(firstItem.id);
    
    const updatedState = useDopamineMenuStore.getState();
    const updatedItem = updatedState.items[0];
    
    expect(updatedItem.completedCount).toBe(initialCount + 1);
    expect(updatedItem.lastCompletedAt).toBeDefined();
    expect(updatedState.completedToday.length).toBe(1);
    expect(updatedState.completedToday[0].itemId).toBe(firstItem.id);
  });

  it('edits an item', () => {
    const state = useDopamineMenuStore.getState();
    const firstItemId = state.items[0].id;
    const newTitle = 'Updated title 123';

    state.editItem(firstItemId, { title: newTitle });
    expect(useDopamineMenuStore.getState().items[0].title).toBe(newTitle);
  });

  it('deletes an item', () => {
    const state = useDopamineMenuStore.getState();
    const firstItemId = state.items[0].id;
    const initialLength = state.items.length;

    state.deleteItem(firstItemId);
    expect(useDopamineMenuStore.getState().items.length).toBe(initialLength - 1);
    expect(useDopamineMenuStore.getState().items.find(i => i.id === firstItemId)).toBeUndefined();
  });

  it('resets completedToday', () => {
    const state = useDopamineMenuStore.getState();
    const firstItemId = state.items[0].id;

    state.completeItem(firstItemId);
    expect(useDopamineMenuStore.getState().completedToday.length).toBe(1);

    useDopamineMenuStore.getState().resetCompletedToday();
    expect(useDopamineMenuStore.getState().completedToday.length).toBe(0);
  });
});
