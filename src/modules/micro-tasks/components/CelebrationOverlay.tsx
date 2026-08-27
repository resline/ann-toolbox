import React, { useEffect } from 'react';
import { PartyPopper } from 'lucide-react';
import { clsx } from 'clsx';

interface CelebrationOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  message?: string;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  isVisible,
  onComplete,
  message = "Great job! Task completed.",
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-sage-500/10 dark:bg-sage-400/10 backdrop-blur-[2px] animate-in fade-in duration-300" />
      <div 
        className={clsx(
          "bg-white dark:bg-warmgray-800 p-8 rounded-3xl shadow-2xl border border-sage-200 dark:border-sage-900/50 flex flex-col items-center text-center max-w-sm w-full mx-4",
          "animate-in zoom-in slide-in-from-bottom-8 duration-500 delay-100 ease-out"
        )}
      >
        <div className="w-20 h-20 bg-sage-100 dark:bg-sage-900/50 rounded-full flex items-center justify-center text-sage-600 dark:text-sage-400 mb-6 animate-bounce">
          <PartyPopper className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-warmgray-900 dark:text-white mb-2">
          Woohoo!
        </h2>
        <p className="text-lg text-warmgray-600 dark:text-warmgray-300">
          {message}
        </p>
      </div>
    </div>
  );
};
