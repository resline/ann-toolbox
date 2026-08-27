import React from 'react';
import { Check, ChevronRight, LayoutList } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SingleStepFocusViewProps {
  taskTitle: string;
  stepTitle: string;
  stepNumber: number;
  totalSteps: number;
  onComplete: () => void;
  onSkip?: () => void;
  onViewList: () => void;
}

export const SingleStepFocusView: React.FC<SingleStepFocusViewProps> = ({
  taskTitle,
  stepTitle,
  stepNumber,
  totalSteps,
  onComplete,
  onSkip,
  onViewList,
}) => {
  const progress = (stepNumber / totalSteps) * 100;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-sage-600 dark:text-sage-400 mb-1">
            Focus Mode
          </span>
          <h2 className="text-xl font-semibold text-warmgray-500 dark:text-warmgray-400 truncate max-w-[200px] sm:max-w-md">
            {taskTitle}
          </h2>
        </div>
        <button
          onClick={onViewList}
          className="flex items-center gap-2 px-4 py-2 min-h-[48px] rounded-xl text-sm font-medium text-warmgray-600 bg-warmgray-100 hover:bg-warmgray-200 dark:bg-warmgray-800 dark:text-warmgray-300 dark:hover:bg-warmgray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
        >
          <LayoutList className="w-4 h-4" />
          <span className="hidden sm:inline">View List</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-400 font-bold text-xl">
          {stepNumber}/{totalSteps}
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-warmgray-900 dark:text-white mb-12 leading-tight max-w-lg">
          {stepTitle}
        </h1>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
          <button
            onClick={onComplete}
            className={twMerge(
              clsx(
                'flex-1 w-full flex items-center justify-center gap-2 px-8 py-4 min-h-[64px] rounded-2xl text-lg font-bold text-white',
                'bg-sage-600 hover:bg-sage-700 active:bg-sage-800 shadow-lg shadow-sage-500/20 active:scale-95',
                'transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sage-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-warmgray-900'
              )
            )}
          >
            <Check className="w-6 h-6" />
            Done
          </button>
          
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-6 py-4 min-h-[64px] min-w-[64px] rounded-2xl text-warmgray-500 hover:bg-warmgray-100 dark:hover:bg-warmgray-800 dark:text-warmgray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 flex items-center justify-center"
              aria-label="Skip step"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between text-xs font-medium text-warmgray-500 dark:text-warmgray-400 mb-2">
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-warmgray-100 dark:bg-warmgray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-sage-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
