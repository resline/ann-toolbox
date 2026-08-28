import React, { useState, useEffect } from 'react';
import { X, Save } from '../../../lib/icons';
import { DopamineItem, EnergyLevel, DopamineCategory } from '../types';
import { useDopamineMenuStore } from '../store';

interface EditDopamineItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DopamineItem | null;
}

export const EditDopamineItemModal: React.FC<EditDopamineItemModalProps> = ({ isOpen, onClose, item }) => {
  const editItem = useDopamineMenuStore((state) => state.editItem);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [energyRequired, setEnergyRequired] = useState<EnergyLevel>('low');
  const [category, setCategory] = useState<DopamineCategory>('appetizer');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setDurationMinutes(item.durationMinutes || '');
      setEnergyRequired(item.energyRequired);
      setCategory(item.category);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    editItem(item.id, {
      title,
      description,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      energyRequired,
      category,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warmgray-900/50 backdrop-blur-sm duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-warmgray-800 rounded-3xl shadow-xl overflow-hidden duration-300 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-warmgray-100 dark:border-warmgray-700">
          <h2 className="text-xl font-semibold text-warmgray-900 dark:text-warmgray-100">
            Edytuj aktywność
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-warmgray-400 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-1">
              Tytuł
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-200 dark:border-warmgray-700 focus:outline-none focus:ring-2 focus:ring-sage-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-1">
              Kategoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DopamineCategory)}
              className="w-full px-4 py-2 rounded-xl bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-200 dark:border-warmgray-700 focus:outline-none focus:ring-2 focus:ring-sage-500"
            >
              <option value="appetizer">Przystawki (1–5 min)</option>
              <option value="entree">Dania Główne (20–60 min)</option>
              <option value="side">Dodatki (w tle)</option>
              <option value="dessert">Desery (uważne nagrody)</option>
              <option value="special">Dania Specjalne</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-1">
              Wymagany poziom energii
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyRequired(level)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    energyRequired === level
                      ? 'bg-sage-500 text-white'
                      : 'bg-warmgray-100 text-warmgray-600 dark:bg-warmgray-700 dark:text-warmgray-300 hover:bg-warmgray-200'
                  }`}
                >
                  {level === 'low' ? 'Niska ⚡' : level === 'medium' ? 'Średnia ⚡⚡' : 'Wysoka ⚡⚡⚡'}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-1">
              Czas trwania (minuty, opcjonalnie)
            </label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2 rounded-xl bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-200 dark:border-warmgray-700 focus:outline-none focus:ring-2 focus:ring-sage-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-1">
              Opis (opcjonalnie)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-200 dark:border-warmgray-700 focus:outline-none focus:ring-2 focus:ring-sage-500 resize-none h-24"
            />
          </div>
        </form>
        
        <div className="p-5 border-t border-warmgray-100 dark:border-warmgray-700">
          <button
            type="submit"
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-sage-600 hover:bg-sage-700 shadow-sm transition-all active:scale-95"
          >
            <Save className="w-5 h-5" />
            Zapisz zmiany
          </button>
        </div>
      </div>
    </div>
  );
};
