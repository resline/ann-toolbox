import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DopamineItem, DopamineMenuState, EnergyLevel } from './types';
import { DEFAULT_DOPAMINE_MENU } from './presets';

interface DopamineMenuStore extends DopamineMenuState {
  addItem: (item: DopamineItem) => void;
  updateItem: (id: string, updates: Partial<DopamineItem>) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  togglePin: (id: string) => void;
  setEnergyFilter: (level: EnergyLevel | 'all') => void;
  rollRoulette: () => DopamineItem | null;
  resetToDefaults: () => void;
}

export const useDopamineMenuStore = create<DopamineMenuStore>()(
  persist(
    (set, get) => ({
      items: DEFAULT_DOPAMINE_MENU,
      selectedItemId: null,
      energyFilter: 'all',

      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] })),
      
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        })),

      selectItem: (id) => set({ selectedItemId: id }),
      
      togglePin: (id) => 
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isPinned: !item.isPinned } : item
          ),
        })),

      setEnergyFilter: (level) => set({ energyFilter: level }),

      rollRoulette: () => {
        const state = get();
        const availableItems = state.energyFilter === 'all' 
          ? state.items 
          : state.items.filter(item => item.energyRequired === state.energyFilter);
        
        if (availableItems.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * availableItems.length);
        const selected = availableItems[randomIndex];
        set({ selectedItemId: selected.id });
        return selected;
      },

      resetToDefaults: () => set({ items: DEFAULT_DOPAMINE_MENU, selectedItemId: null, energyFilter: 'all' }),
    }),
    {
      name: 'ann_dopamine_menu',
    }
  )
);
