export type DopamineCategory = 'appetizer' | 'entree' | 'side' | 'dessert' | 'special';

export type EnergyLevel = 'low' | 'medium' | 'high';

export interface DopamineItem {
  id: string;
  title: string;
  description?: string;
  category: DopamineCategory;
  energyRequired: EnergyLevel;
  durationMinutes?: number;
  icon?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isCustom?: boolean;
  completedCount?: number;
  lastCompletedAt?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
  tags?: string[];
}

export interface CompletedDopamineEntry {
  id: string;
  itemId: string;
  title: string;
  category: DopamineCategory;
  timestamp: string;
  energy: EnergyLevel;
}

export interface DopamineMenuState {
  items: DopamineItem[];
  selectedItemId: string | null;
  energyFilter: EnergyLevel | 'all';
  completedToday: CompletedDopamineEntry[];
}
