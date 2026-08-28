import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Check, Star, Edit2, Trash2, MoreVertical } from 'lucide-react';

interface DopamineCardProps {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  duration?: string;
  energyLevel?: 'low' | 'medium' | 'high';
  category?: string;
  categoryColor?: 'pink' | 'blue' | 'green' | 'yellow' | 'purple';
  isFavorite?: boolean;
  onClick: (id: string) => void;
  onDone?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const DopamineCard: React.FC<DopamineCardProps> = ({
  id,
  title,
  description,
  icon,
  duration,
  energyLevel,
  category,
  categoryColor = 'pink',
  isFavorite,
  onClick,
  onDone,
  onToggleFavorite,
  onEdit,
  onDelete,
}) => {
  const [isDone, setIsDone] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDone(true);
    if (onDone) onDone(id);
    setTimeout(() => setIsDone(false), 2000);
  };

  const energyLabels = {
    low: '⚡ Niska',
    medium: '⚡ Średnia',
    high: '⚡ Wysoka',
  };

  const energyColors = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };

  const badgeColors = {
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <div
      onClick={() => onClick(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(id);
        }
      }}
      role="button"
      tabIndex={0}
      className={twMerge(
        clsx(
          'w-full text-left flex flex-col gap-3 p-4 min-h-[48px] rounded-3xl cursor-pointer',
          'bg-white dark:bg-warmgray-800 shadow-sm border border-warmgray-200 dark:border-warmgray-700',
          'transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500',
          'active:scale-[0.98]',
          isDone && 'ring-2 ring-sage-400 bg-sage-50 dark:bg-sage-900/20',
          isFavorite && !isDone && 'ring-2 ring-yellow-400/50 dark:ring-yellow-500/50 shadow-yellow-100 dark:shadow-yellow-900/20'
        )
      )}
      aria-label={`Dopamine item: ${title}`}
    >
      <div className="flex items-start gap-3 w-full">
        {icon && (
          <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-sage-500/10 dark:bg-sage-400/15 text-sage-600 dark:text-sage-300">
            {icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {category && (
                <span className={clsx('inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1', badgeColors[categoryColor])}>
                  {category}
                </span>
              )}
              <h3 className="text-base font-semibold text-warmgray-900 dark:text-warmgray-100 truncate">
                {title}
              </h3>
            </div>
            
            <div className="flex items-center gap-1 shrink-0 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(id);
                }}
                className={clsx(
                  "p-1.5 rounded-lg transition-colors",
                  isFavorite 
                    ? "text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30" 
                    : "text-warmgray-400 hover:text-warmgray-600 hover:bg-warmgray-100 dark:hover:bg-warmgray-700"
                )}
                aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              >
                <Star className={clsx("w-5 h-5", isFavorite && "fill-current")} />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 text-warmgray-400 hover:text-warmgray-600 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 rounded-lg transition-colors"
                aria-label="Więcej opcji"
                aria-expanded={isMenuOpen}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-warmgray-800 rounded-xl shadow-lg border border-warmgray-100 dark:border-warmgray-700 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onEdit?.(id);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-warmgray-700 dark:text-warmgray-300 hover:bg-warmgray-50 dark:hover:bg-warmgray-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edytuj
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onDelete?.(id);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Usuń
                  </button>
                </div>
              )}
            </div>
          </div>
          {description && (
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400 mt-1 line-clamp-2 leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between w-full mt-1">
        <div className="flex flex-wrap items-center gap-2">
          {duration && (
            <span className="inline-flex items-center text-xs font-medium bg-warmgray-100 dark:bg-warmgray-700 text-warmgray-600 dark:text-warmgray-300 px-2.5 py-1 rounded-full">
              ⏱️ {duration}
            </span>
          )}
          {energyLevel && (
            <span
              className={clsx(
                'inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full',
                energyColors[energyLevel]
              )}
            >
              {energyLabels[energyLevel]}
            </span>
          )}
        </div>
        
        <button
          onClick={handleDone}
          className={clsx(
            'ml-2 shrink-0 flex items-center justify-center min-h-[36px] px-4 rounded-xl text-sm font-semibold transition-all duration-300',
            isDone 
              ? 'bg-sage-500 text-white shadow-sm' 
              : 'bg-warmgray-100 dark:bg-warmgray-700 text-warmgray-700 dark:text-warmgray-200 hover:bg-sage-100 hover:text-sage-700 dark:hover:bg-sage-900/30 dark:hover:text-sage-300'
          )}
        >
          {isDone ? (
            <span className="flex items-center gap-1 animate-in zoom-in duration-200">
              <Check className="w-4 h-4" /> Zrobione! ✨
            </span>
          ) : (
            'Zrobione!'
          )}
        </button>
      </div>
    </div>
  );
};
