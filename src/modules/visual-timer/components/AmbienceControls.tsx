import React from 'react';
import { Volume2, VolumeX, CloudRain, Wind, Flame, Coffee } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AmbienceControlsProps {
  activeSound: string | null;
  volume: number;
  onToggleSound: (soundId: string) => void;
  onVolumeChange: (volume: number) => void;
}

export const AmbienceControls: React.FC<AmbienceControlsProps> = ({
  activeSound,
  volume,
  onToggleSound,
  onVolumeChange,
}) => {
  const sounds = [
    { id: 'rain', label: 'Rain', icon: CloudRain },
    { id: 'wind', label: 'Wind', icon: Wind },
    { id: 'fire', label: 'Fire', icon: Flame },
    { id: 'cafe', label: 'Cafe', icon: Coffee },
  ];

  return (
    <div className="bg-white dark:bg-warmgray-800 rounded-3xl p-4 sm:p-6 border border-warmgray-200 dark:border-warmgray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-warmgray-900 dark:text-warmgray-100 uppercase tracking-wider">
          Background Ambience
        </h3>
        <div className="flex items-center gap-2">
          {volume === 0 ? (
            <VolumeX className="w-4 h-4 text-warmgray-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-warmgray-500" />
          )}
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
            className="w-24 h-1.5 bg-warmgray-200 dark:bg-warmgray-700 rounded-lg appearance-none cursor-pointer accent-sage-500"
            aria-label="Volume"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {sounds.map((sound) => {
          const Icon = sound.icon;
          const isActive = activeSound === sound.id;
          
          return (
            <button
              key={sound.id}
              onClick={() => onToggleSound(sound.id)}
              className={twMerge(
                clsx(
                  'flex flex-col items-center justify-center gap-2 p-3 min-h-[80px] rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 active:scale-95',
                  isActive
                    ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300 shadow-inner'
                    : 'bg-warmgray-50 text-warmgray-500 hover:bg-warmgray-100 dark:bg-warmgray-800/50 dark:text-warmgray-400 dark:hover:bg-warmgray-700'
                )
              )}
              aria-pressed={isActive}
            >
              <Icon className={clsx("w-6 h-6", isActive ? "animate-pulse" : "")} />
              <span className="text-xs font-medium">{sound.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
