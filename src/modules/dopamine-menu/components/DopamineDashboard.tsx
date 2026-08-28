import React, { useState } from 'react';
import { Plus, Sparkles, Filter } from '../../../lib/icons';
import * as Icons from '../../../lib/icons';
import { CategorySection } from './CategorySection';
import { DopamineCard } from './DopamineCard';
import { DopamineRouletteModal } from './DopamineRouletteModal';
import { AddDopamineItemModal } from './AddDopamineItemModal';
import { DopamineBankWidget } from './DopamineBankWidget';
import { DopamineSOSModal } from './DopamineSOSModal';
import { EditDopamineItemModal } from './EditDopamineItemModal';
import { useDopamineMenuStore } from '../store';
import { DopamineCategory, DopamineItem } from '../types';

const CATEGORY_LABELS: Record<DopamineCategory, string> = {
  appetizer: 'Przystawki (1–5 min)',
  entree: 'Dania Główne (20–60 min)',
  side: 'Dodatki (w tle)',
  dessert: 'Desery (uważne nagrody)',
  special: 'Dania Specjalne'
};

export const DopamineDashboard: React.FC = () => {
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DopamineItem | null>(null);
  
  const items = useDopamineMenuStore((state) => state.items);
  const addItem = useDopamineMenuStore((state) => state.addItem);
  const energyFilter = useDopamineMenuStore((state) => state.energyFilter);
  const setEnergyFilter = useDopamineMenuStore((state) => state.setEnergyFilter);
  const completeItem = useDopamineMenuStore((state) => state.completeItem);
  const toggleFavorite = useDopamineMenuStore((state) => state.toggleFavorite);
  const deleteItem = useDopamineMenuStore((state) => state.deleteItem);

  const handleAddItem = (newItem: { title: string; description: string; energyLevel: 'low' | 'medium' | 'high' }) => {
    addItem({
      id: Math.random().toString(36).substr(2, 9),
      title: newItem.title,
      description: newItem.description,
      energyRequired: newItem.energyLevel,
      category: 'special',
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

  const filterLabels: Record<string, string> = {
    all: 'Wszystkie',
    low: 'Niska energia ⚡',
    medium: 'Średnia ⚡⚡',
    high: 'Wysoka ⚡⚡⚡'
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-8 duration-500">
      <DopamineBankWidget />
      
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warmgray-900 dark:text-warmgray-50 tracking-tight">
            Menu Dopaminowe
          </h1>
          <p className="text-warmgray-500 dark:text-warmgray-400 mt-1">
            Wybierz aktywność lub wylosuj mikronagrodę, aby podnieść poziom energii bez presji.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSOSModalOpen(true)}
            data-testid="sos-btn"
            aria-label="SOS Paraliż"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-2xl font-bold text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 shadow-sm transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <span className="text-lg leading-none">🚨</span>
            <span>SOS</span>
          </button>
          <button
            onClick={() => setIsRouletteOpen(true)}
            data-testid="roulette-btn"
            aria-label="Zakręć kołem dopaminy"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-2xl font-semibold text-sage-800 bg-sage-100 hover:bg-sage-200 dark:bg-sage-900/40 dark:text-sage-200 dark:hover:bg-sage-900/60 shadow-sm transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          >
            <Sparkles className="w-4 h-4 text-sage-600 dark:text-sage-400" />
            <span className="hidden sm:inline">Zakręć!</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            data-testid="add-item-btn"
            aria-label="Dodaj nową aktywność"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-2xl font-semibold text-white bg-sage-600 hover:bg-sage-700 shadow-sm transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Dodaj</span>
          </button>
        </div>
      </header>

      <div className="flex gap-2 items-center flex-wrap" data-testid="energy-filters">
        <Filter className="w-4 h-4 text-warmgray-500 mr-1" />
        {(['all', 'low', 'medium', 'high'] as const).map(level => (
          <button
            key={level}
            data-testid={`filter-${level}`}
            onClick={() => setEnergyFilter(level)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
              energyFilter === level 
                ? 'bg-sage-600 text-white shadow-sage-600/20' 
                : 'bg-white/80 dark:bg-warmgray-800/80 text-warmgray-700 dark:text-warmgray-300 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 border border-warmgray-200/60 dark:border-warmgray-700/60'
            }`}
          >
            {filterLabels[level]}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {categories.map(category => {
          const categoryItems = filteredItems
            .filter(item => item.category === category)
            .sort((a, b) => {
              if (a.isFavorite && !b.isFavorite) return -1;
              if (!a.isFavorite && b.isFavorite) return 1;
              return 0;
            });
            
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
                  isFavorite={item.isFavorite}
                  onClick={(id) => console.log('Clicked', id)}
                  onDone={(id) => completeItem(id)}
                  onToggleFavorite={(id) => toggleFavorite(id)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={(id) => deleteItem(id)}
                />
              ))}
            </CategorySection>
          );
        })}
      </div>

      <DopamineSOSModal 
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
      />

      <EditDopamineItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
      />

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
