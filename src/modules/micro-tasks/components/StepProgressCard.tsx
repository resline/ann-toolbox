import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StepProgressCardProps {
  id: string;
  title: string;
  isCompleted: boolean;
  isActive: boolean;
  onClick: (id: string) => void;
}

export const StepProgressCard: React.FC<StepProgressCardProps> = ({
  id,
  title,
  isCompleted,
  isActive,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={twMerge(
        clsx(
          'w-full text-left flex items-center gap-4 p-4 min-h-[56px] rounded-2xl transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500',
          isActive
            ? 'bg-sage-50 dark:bg-sage-900/20 border-2 border-sage-500 dark:border-sage-500/50 shadow-sm'
            : isCompleted
            ? 'bg-warmgray-50/50 dark:bg-warmgray-800/30 border border-warmgray-200 dark:border-warmgray-700 opacity-60'
            : 'bg-white dark:bg-warmgray-800 border border-warmgray-200 dark:border-warmgray-700 hover:border-sage-300 dark:hover:border-sage-700'
        )
      )}
      aria-current={isActive ? 'step' : undefined}
    >
      <div className={clsx(
        "shrink-0 flex items-center justify-center transition-colors",
        isCompleted ? 'text-sage-500' : isActive ? 'text-sage-600 dark:text-sage-400' : 'text-warmgray-300 dark:text-warmgray-600'
      )}>
        {isCompleted ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : (
          <Circle className="w-6 h-6" />
        )}
      </div>
      
      <span className={clsx(
        "flex-1 text-base font-medium transition-colors",
        isCompleted 
          ? 'text-warmgray-400 dark:text-warmgray-500 line-through'
          : isActive
          ? 'text-sage-900 dark:text-sage-50'
          : 'text-warmgray-700 dark:text-warmgray-200'
      )}>
        {title}
      </span>
    </button>
  );
};
