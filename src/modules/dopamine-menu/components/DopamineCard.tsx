import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DopamineCardProps {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  duration?: string;
  energyLevel?: 'low' | 'medium' | 'high';
  onClick: (id: string) => void;
}

export const DopamineCard: React.FC<DopamineCardProps> = ({
  id,
  title,
  description,
  icon,
  duration,
  energyLevel,
  onClick,
}) => {
  const energyColors = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={twMerge(
        clsx(
          'w-full text-left flex items-start gap-3 p-4 min-h-[48px] rounded-2xl',
          'bg-white dark:bg-warmgray-800 shadow-sm border border-warmgray-200 dark:border-warmgray-700',
          'transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500',
          'active:scale-[0.98]'
        )
      )}
      aria-label={`Dopamine item: ${title}`}
    >
      {icon && (
        <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-sage-500/10 dark:bg-sage-400/15 text-sage-600 dark:text-sage-300">
          {icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="text-base font-semibold text-warmgray-900 dark:text-warmgray-100 truncate">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400 mt-1 line-clamp-2 leading-snug">
            {description}
          </p>
        )}
        
        {(duration || energyLevel) && (
          <div className="flex items-center gap-2 mt-3">
            {duration && (
              <span className="inline-flex items-center text-xs font-medium bg-warmgray-100 dark:bg-warmgray-700 text-warmgray-600 dark:text-warmgray-300 px-2 py-1 rounded-md">
                {duration}
              </span>
            )}
            {energyLevel && (
              <span
                className={clsx(
                  'inline-flex items-center text-xs font-medium px-2 py-1 rounded-md',
                  energyColors[energyLevel]
                )}
              >
                {energyLevel.charAt(0).toUpperCase() + energyLevel.slice(1)} Energy
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};
