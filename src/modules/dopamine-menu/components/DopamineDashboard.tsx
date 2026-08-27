import React, { useState } from 'react';
import { Plus, Sparkles, Filter } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CategorySection } from './CategorySection';
import { DopamineCard } from './DopamineCard';
import { DopamineRouletteModal } from './DopamineRouletteModal';
import { AddDopamineItemModal } from './AddDopamineItemModal';
import { useDopamineMenuStore } from '../store';
import { DopamineCategory } from '../types';

const CATEGORY_LABELS: Record<DopamineCategory, string> = {
  appetizer: 'Appetizers',
  entree: 'Entrees',
  side: 'Sides',
  dessert: 'Desserts',
  special: 'Specials'
};

export const DopamineDashboard: React.FC = () => {
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const items = useDopamineMenuStore((state) => state.items);
  const addItem = useDopamineMenuStore((state) => state.addItem);
  const energyFilter = useDopamineMenuStore((state) => state.energyFilter);
  const setEnergyFilter = useDopamineMenuStore((state) => state.setEnergyFilter);

  const handleAddItem = (newItem: { title: string; description: string; energyLevel: 'low' | 'medium' | 'high' }) => {
    addItem({
      id: Math.random().toString(36).substr(2, 9),
      title: newItem.title,
      description: newItem.description,
      energyRequired: newItem.energyLevel,
      category: 'special', // default to special or let them pick
    });
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return <Sparkles className="w-6 h-6" />;
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />;
  };

  const filteredItems = energyFilter === 'all' 
    ? items 
    : items.filter(item => item.energyRequired === energyFilter);

  const categories: DopamineCategory[] = ['appetizer', 'entree', 'side', 'dessert', 'special'];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warmgray-900 dark:text-warmgray-50 tracking-tight">
            Dopamine Menu
          </h1>
          <p className="text-warmgray-500 dark:text-warmgray-400 mt-1">
            Pick a quick activity to boost your mood and energy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRouletteOpen(true)}
            data-testid="roulette-btn"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl font-medium text-sage-700 bg-sage-100 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          >
            <Sparkles className="w-4 h-4" />
            Pick for Me
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            data-testid="add-item-btn"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl font-medium text-white bg-sage-600 hover:bg-sage-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-warmgray-900"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
        </div>
      </header>

      <div className="flex gap-2 items-center flex-wrap" data-testid="energy-filters">
        <Filter className="w-5 h-5 text-warmgray-500" />
        {(['all', 'low', 'medium', 'high'] as const).map(level => (
          <button
            key={level}
            data-testid={`filter-${level}`}
            onClick={() => setEnergyFilter(level)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              energyFilter === level 
                ? 'bg-sage-600 text-white' 
                : 'bg-warmgray-100 text-warmgray-700 hover:bg-warmgray-200 dark:bg-warmgray-800 dark:text-warmgray-300 dark:hover:bg-warmgray-700'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {categories.map(category => {
          const categoryItems = filteredItems.filter(item => item.category === category);
          if (categoryItems.length === 0) return null;
          return (
            <CategorySection key={category} title={CATEGORY_LABELS[category]}>
              {categoryItems.map(item => (
                <DopamineCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  description={item.description}
                  duration={item.durationMinutes ? `${item.durationMinutes} min` : undefined}
                  energyLevel={item.energyRequired}
                  icon={getIcon(item.icon)}
                  onClick={(id) => console.log('Clicked', id)}
                />
              ))}
            </CategorySection>
          );
        })}
      </div>

      <DopamineRouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        items={filteredItems.map(item => ({
          id: item.id,
          title: item.title,
          icon: getIcon(item.icon)
        }))}
      />
      
      <AddDopamineItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
      />
    </div>
  );
};
