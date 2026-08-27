import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BreathingCircleProps {
  isActive: boolean;
  message?: string;
}

export const BreathingCircle: React.FC<BreathingCircleProps> = ({
  isActive,
  message = "Breathe in...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
      <div className="relative w-48 h-48 flex items-center justify-center mb-8">
        <div 
          className={twMerge(
            clsx(
              'absolute inset-0 rounded-full bg-sage-200/50 dark:bg-sage-500/20',
              isActive ? 'animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]' : ''
            )
          )} 
        />
        <div 
          className={twMerge(
            clsx(
              'absolute inset-4 rounded-full bg-sage-300/60 dark:bg-sage-400/30 backdrop-blur-sm transition-transform duration-4000 ease-in-out',
              isActive ? 'scale-110' : 'scale-100'
            )
          )} 
        />
        <div 
          className={twMerge(
            clsx(
              'relative z-10 w-24 h-24 rounded-full bg-sage-500 dark:bg-sage-400 flex items-center justify-center shadow-lg transition-transform duration-4000 ease-in-out',
              isActive ? 'scale-125' : 'scale-100'
            )
          )}
        />
      </div>
      <p className="text-lg font-medium text-sage-800 dark:text-sage-200 animate-pulse text-center h-8">
        {isActive ? message : "Ready to breathe?"}
      </p>
    </div>
  );
};
