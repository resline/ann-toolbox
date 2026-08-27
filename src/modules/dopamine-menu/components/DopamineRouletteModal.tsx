import React, { useState } from 'react';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DopamineRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: { id: string; title: string; icon?: React.ReactNode }[];
}

export const DopamineRouletteModal: React.FC<DopamineRouletteModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; title: string; icon?: React.ReactNode } | null>(null);

  if (!isOpen) return null;

  const spin = () => {
    setIsSpinning(true);
    setSelectedItem(null);
    
    // Simulate roulette spin
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * items.length);
      setSelectedItem(items[randomIndex]);
      setIsSpinning(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-warmgray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className={twMerge(
          clsx(
            'bg-white dark:bg-warmgray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-warmgray-200 dark:border-warmgray-700',
            'transform transition-all duration-300 scale-100 opacity-100'
          )
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roulette-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-warmgray-100 dark:border-warmgray-700">
          <h2 id="roulette-title" className="text-lg font-semibold text-warmgray-900 dark:text-warmgray-50 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sage-500" />
            Random Pick
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-warmgray-500 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center min-h-[240px]">
          {isSpinning ? (
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sage-500" />
          ) : selectedItem ? (
            <div className="text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center text-sage-600 dark:text-sage-400 mb-4 shadow-inner">
                {selectedItem.icon || <Sparkles className="w-10 h-10" />}
              </div>
              <h3 className="text-2xl font-bold text-warmgray-900 dark:text-white mb-2">
                {selectedItem.title}
              </h3>
              <p className="text-warmgray-500 dark:text-warmgray-400">
                Go enjoy this activity!
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-warmgray-100 dark:bg-warmgray-700 flex items-center justify-center text-warmgray-400 dark:text-warmgray-500 mb-4">
                <RefreshCw className="w-10 h-10" />
              </div>
              <p className="text-warmgray-600 dark:text-warmgray-300">
                Can't decide? Let fate choose for you.
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-warmgray-50 dark:bg-warmgray-800/50 border-t border-warmgray-100 dark:border-warmgray-700 flex justify-center">
          <button
            onClick={spin}
            disabled={isSpinning || items.length === 0}
            className={twMerge(
              clsx(
                'flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-base font-semibold transition-all min-h-[48px]',
                isSpinning || items.length === 0
                  ? 'bg-warmgray-200 text-warmgray-400 dark:bg-warmgray-700 dark:text-warmgray-500 cursor-not-allowed'
                  : 'bg-sage-600 hover:bg-sage-700 active:bg-sage-800 text-white shadow-sm hover:shadow active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-warmgray-800'
              )
            )}
          >
            {isSpinning ? 'Choosing...' : selectedItem ? 'Spin Again' : 'Spin the Wheel'}
          </button>
        </div>
      </div>
    </div>
  );
};
