import React from 'react';
import { Volume2, VolumeX, CloudRain, Waves, TreePine } from '../../../lib/icons';
import { cn } from '../../../lib/cn';

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
    { id: 'rain', label: 'Deszcz', icon: CloudRain },
    { id: 'brown-noise', label: 'Szum brązowy', icon: Waves },
    { id: 'forest', label: 'Las', icon: TreePine },
  ];

  return (
    <div className="bg-white/60 dark:bg-warmgray-800/60 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/20 dark:border-warmgray-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-warmgray-900 dark:text-warmgray-100 uppercase tracking-widest">
            Tło Dźwiękowe
          </h3>
          {activeSound && (
            <div className="flex items-center gap-1">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-sage-500 rounded-full animate-pulse" 
                  style={{ 
                    height: `${Math.random() * 8 + 4}px`, 
                    animationDelay: `${i * 150}ms`,
                    animationDuration: '800ms'
                  }} 
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 bg-white/50 dark:bg-warmgray-900/50 px-3 py-1.5 rounded-full shadow-inner">
          {volume === 0 ? (
            <VolumeX className="w-4 h-4 text-warmgray-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-sage-500" />
          )}
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
            className="w-20 sm:w-24 h-1.5 bg-warmgray-200 dark:bg-warmgray-700 rounded-lg appearance-none cursor-pointer accent-sage-500"
            aria-label="Volume"
          />
          <span className="text-xs font-semibold text-warmgray-500 dark:text-warmgray-400 w-8 text-right tabular-nums">
            {volume}%
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {sounds.map((sound) => {
          const Icon = sound.icon;
          const isActive = activeSound === sound.id;
          
          return (
            <button
              key={sound.id}
              onClick={() => onToggleSound(sound.id)}
              className={cn(
                  'relative overflow-hidden flex flex-col items-center justify-center gap-3 p-4 min-h-[96px] rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 group',
                  isActive
                    ? 'bg-sage-100/80 text-sage-700 dark:bg-sage-900/60 dark:text-sage-300 shadow-inner'
                    : 'bg-white/50 text-warmgray-500 hover:bg-white hover:shadow-sm hover:-translate-y-0.5 dark:bg-warmgray-800/50 dark:text-warmgray-400 dark:hover:bg-warmgray-700/80'
                )
              }
              aria-pressed={isActive}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-t from-sage-200/50 to-transparent dark:from-sage-800/50 opacity-50" />
              )}
              
              <div className="relative z-10">
                <Icon className={cn(
                  "w-7 h-7 transition-transform duration-500", 
                  isActive ? "scale-110 drop-shadow-sm" : "group-hover:scale-110 group-hover:text-warmgray-700 dark:group-hover:text-warmgray-200"
                )} />
              </div>
              
              <span className={cn(
                "relative z-10 text-xs font-semibold tracking-wide",
                isActive ? "" : "group-hover:text-warmgray-700 dark:group-hover:text-warmgray-200"
              )}>
                {sound.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
