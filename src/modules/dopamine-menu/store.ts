import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, passthroughMigration, versionedPersist } from '../../lib/storage/persist';
import { DopamineItem, DopamineMenuState, EnergyLevel } from './types';
import { DEFAULT_DOPAMINE_MENU } from './presets';

interface DopamineMenuStore extends DopamineMenuState {
  addItem: (item: DopamineItem) => void;
  updateItem: (id: string, updates: Partial<DopamineItem>) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  completeItem: (id: string) => void;
  editItem: (id: string, updates: Partial<DopamineItem>) => void;
  deleteItem: (id: string) => void;
  resetCompletedToday: () => void;
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
      completedToday: [],

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

      resetToDefaults: () => set({ items: DEFAULT_DOPAMINE_MENU, selectedItemId: null, energyFilter: 'all', completedToday: [] }),

      toggleFavorite: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          ),
        })),

      completeItem: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (!item) return state;
          
          const newEntry = {
            id: crypto.randomUUID(),
            itemId: item.id,
            title: item.title,
            category: item.category,
            timestamp: new Date().toISOString(),
            energy: item.energyRequired,
          };
          
          return {
            completedToday: [...state.completedToday, newEntry],
            items: state.items.map((i) =>
              i.id === id
                ? {
                    ...i,
                    completedCount: (i.completedCount || 0) + 1,
                    lastCompletedAt: newEntry.timestamp,
                  }
                : i
            ),
          };
        }),

      editItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        })),

      resetCompletedToday: () => set({ completedToday: [] }),
    }),
    // Wersja 1 to punkt zerowy: kształt dokładnie taki, jaki już leży
    // w localStorage użytkowniczki. Dopiero od niego przyszła zmiana pola
    // będzie miała się o co oprzeć.
    versionedPersist<DopamineMenuStore>({
      key: STORAGE_KEYS.energia,
      version: 1,
      migrate: passthroughMigration,
    })
  )
);
