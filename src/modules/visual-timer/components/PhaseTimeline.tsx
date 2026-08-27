import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PhaseTimelineProps {
  currentPhaseIndex: number;
  phases: Array<{ id: string; type: 'focus' | 'short-break' | 'long-break'; duration: number }>;
}

export const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  currentPhaseIndex,
  phases,
}) => {
  return (
    <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-4 px-2 no-scrollbar">
      {phases.map((phase, index) => {
        const isPast = index < currentPhaseIndex;
        const isCurrent = index === currentPhaseIndex;
        
        return (
          <div key={phase.id} className="flex items-center gap-2">
            <div 
              className={twMerge(
                clsx(
                  'h-2 rounded-full transition-all duration-300',
                  phase.type === 'focus' ? 'w-12' : phase.type === 'long-break' ? 'w-8' : 'w-4',
                  isPast 
                    ? 'bg-sage-400 dark:bg-sage-600'
                    : isCurrent
                    ? 'bg-sage-600 dark:bg-sage-400 scale-110 shadow-sm'
                    : 'bg-warmgray-200 dark:bg-warmgray-700'
                )
              )}
              title={`${phase.type} - ${phase.duration}m`}
            />
          </div>
        );
      })}
    </div>
  );
};
