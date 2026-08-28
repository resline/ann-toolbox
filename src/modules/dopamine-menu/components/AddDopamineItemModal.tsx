import React, { useState } from 'react';
import { X, Check } from '../../../lib/icons';
import { cn } from '../../../lib/cn';

interface AddDopamineItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { title: string; description: string; energyLevel: 'low' | 'medium' | 'high' }) => void;
}

export const AddDopamineItemModal: React.FC<AddDopamineItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('low');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd({ title, description, energyLevel });
      setTitle('');
      setDescription('');
      setEnergyLevel('low');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-warmgray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className={cn(
            'bg-white dark:bg-warmgray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-warmgray-200 dark:border-warmgray-700',
            'transform transition-all duration-300 scale-100 opacity-100'
          )
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-warmgray-100 dark:border-warmgray-700">
          <h2 id="add-item-title" className="text-lg font-semibold text-warmgray-900 dark:text-warmgray-50">
            Add New Activity
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-warmgray-500 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-1.5">
              Activity Name
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-warmgray-300 dark:border-warmgray-600 bg-white dark:bg-warmgray-900 text-warmgray-900 dark:text-white placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-500 dark:focus:ring-sage-400 transition-shadow"
              placeholder="e.g., Drink a glass of water"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-warmgray-300 dark:border-warmgray-600 bg-white dark:bg-warmgray-900 text-warmgray-900 dark:text-white placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-500 dark:focus:ring-sage-400 transition-shadow resize-none"
              placeholder="Add some details..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-2">
              Energy Required
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(level)}
                  className={cn(
                      'py-2 px-3 min-h-[48px] rounded-xl text-sm font-medium capitalize transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500',
                      energyLevel === level
                        ? 'bg-sage-100 border-sage-500 text-sage-800 dark:bg-sage-900/40 dark:border-sage-400 dark:text-sage-300 shadow-sm'
                        : 'bg-white border-warmgray-200 text-warmgray-600 hover:bg-warmgray-50 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-warmgray-400 dark:hover:bg-warmgray-700'
                    )
                  }
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[48px] rounded-xl text-sm font-medium text-warmgray-700 bg-white border border-warmgray-300 hover:bg-warmgray-50 dark:bg-warmgray-800 dark:text-warmgray-300 dark:border-warmgray-600 dark:hover:bg-warmgray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 min-h-[48px] rounded-xl text-sm font-medium text-white bg-sage-600 hover:bg-sage-700 active:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-warmgray-800"
            >
              <Check className="w-4 h-4" />
              Save Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
