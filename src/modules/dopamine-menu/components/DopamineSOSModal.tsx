import React, { useEffect, useState } from 'react';
import { Sparkles, X, RefreshCw } from '../../../lib/icons';
import { useDopamineMenuStore } from '../store';

const SOS_ACTIONS = [
  'Wypij 3 łyki chłodnej wody',
  'Popatrz przez okno w dal przez 30 sekund',
  'Przeciągnij się powoli jak kot',
  'Weź 3 głębokie wdechy i wydechy',
  'Umyj twarz zimną wodą',
  'Zrób 5 pajacyków',
  'Przejdź się po pokoju przez 1 minutę',
];

interface DopamineSOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DopamineSOSModal: React.FC<DopamineSOSModalProps> = ({ isOpen, onClose }) => {
  const completeItem = useDopamineMenuStore((state) => state.completeItem);
  const addItem = useDopamineMenuStore((state) => state.addItem);
  const items = useDopamineMenuStore((state) => state.items);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      playChime();
      setCurrentActionIndex(Math.floor(Math.random() * SOS_ACTIONS.length));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentAction = SOS_ACTIONS[currentActionIndex];

  const handleNext = () => {
    setCurrentActionIndex((prev) => (prev + 1) % SOS_ACTIONS.length);
  };

  const handleDone = () => {
    playChime();
    
    // Check if this SOS action already exists in store, if not add it temporarily to mark it complete
    let existingItem = items.find(i => i.title === currentAction && i.category === 'special');
    
    if (!existingItem) {
      const id = crypto.randomUUID();
      addItem({
        id,
        title: currentAction,
        category: 'special',
        energyRequired: 'low',
        durationMinutes: 1,
      });
      completeItem(id);
    } else {
      completeItem(existingItem.id);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warmgray-900/50 backdrop-blur-sm duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-warmgray-800 rounded-3xl shadow-xl overflow-hidden duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-warmgray-400 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 rounded-full transition-colors"
          aria-label="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🚨</span>
          </div>
          
          <h2 className="text-2xl font-bold text-warmgray-900 dark:text-warmgray-100 mb-2">
            SOS Paraliż
          </h2>
          <p className="text-warmgray-500 dark:text-warmgray-400 mb-8 font-medium">
            1 Mały Krok
          </p>
          
          <div className="bg-sage-50 dark:bg-sage-900/20 w-full p-6 rounded-2xl border border-sage-100 dark:border-sage-800 mb-8 min-h-[120px] flex items-center justify-center">
            <p className="text-xl text-sage-800 dark:text-sage-200 font-semibold text-center leading-snug">
              {currentAction}
            </p>
          </div>
          
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleDone}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-lg font-bold text-white bg-sage-500 hover:bg-sage-600 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Sparkles className="w-5 h-5" />
              Zrobione! ✨
            </button>
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-warmgray-600 dark:text-warmgray-300 bg-warmgray-100 hover:bg-warmgray-200 dark:bg-warmgray-700 dark:hover:bg-warmgray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Inna prosta rzecz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
