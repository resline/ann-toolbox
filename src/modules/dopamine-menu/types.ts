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
}

export interface DopamineMenuState {
  items: DopamineItem[];
  selectedItemId: string | null;
  energyFilter: EnergyLevel | 'all';
}
