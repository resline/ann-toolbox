import React, { useState, useEffect } from 'react';
import { Settings2, RefreshCcw } from '../../../lib/icons';
import { MultiPhaseProgressDisc } from './MultiPhaseProgressDisc';
import { BreathingCircle } from './BreathingCircle';
import { AmbienceControls } from './AmbienceControls';
import { PhaseTimeline } from './PhaseTimeline';

type PhaseType = 'focus' | 'short-break' | 'long-break';

interface Phase {
  id: string;
  type: PhaseType;
  duration: number; // in minutes
}

export const VisualTimerModule: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isBreathingMode, setIsBreathingMode] = useState(false);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  
  const [phases] = useState<Phase[]>([
    { id: '1', type: 'focus', duration: 25 },
    { id: '2', type: 'short-break', duration: 5 },
    { id: '3', type: 'focus', duration: 25 },
    { id: '4', type: 'long-break', duration: 15 },
  ]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  
  const currentPhase = phases[currentPhaseIndex];
  
  // Mock time left for UI
  const [timeLeftSec, setTimeLeftSec] = useState(currentPhase.duration * 60);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeftSec > 0) {
      interval = setInterval(() => {
        setTimeLeftSec((prev) => prev - 1);
      }, 1000);
    } else if (timeLeftSec === 0) {
      // Auto advance
      setIsActive(false);
      if (currentPhaseIndex < phases.length - 1) {
        setCurrentPhaseIndex(prev => prev + 1);
        setTimeLeftSec(phases[currentPhaseIndex + 1].duration * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeftSec, currentPhaseIndex, phases]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeftSec(currentPhase.duration * 60);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = 100 - (timeLeftSec / (currentPhase.duration * 60)) * 100;

  return (
    <div className="w-full h-full max-w-lg mx-auto flex flex-col px-4 py-6 sm:py-8 space-y-6 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warmgray-900 dark:text-white tracking-tight">
            Visual Timer
          </h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400 mt-1">
            Stay focused. Remember to breathe.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBreathingMode(!isBreathingMode)}
            className="px-4 py-2 min-h-[48px] rounded-xl text-sm font-medium text-sage-700 bg-sage-100 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          >
            {isBreathingMode ? 'Timer' : 'Breathe'}
          </button>
          <button className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-warmgray-500 hover:bg-warmgray-100 dark:hover:bg-warmgray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center">
        {isBreathingMode ? (
          <BreathingCircle isActive={isActive} />
        ) : (
          <div className="space-y-8">
            <MultiPhaseProgressDisc
              progress={progress}
              phase={currentPhase.type}
              timeLeft={formatTime(timeLeftSec)}
              totalDuration={`${currentPhase.duration}m`}
              isActive={isActive}
              onToggle={toggleTimer}
            />
            
            <div className="flex justify-center">
              <button
                onClick={resetTimer}
                className="flex items-center gap-2 px-4 py-2 min-h-[48px] rounded-xl text-sm font-medium text-warmgray-500 hover:bg-warmgray-100 dark:hover:bg-warmgray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                aria-label="Reset timer"
              >
                <RefreshCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
            
            <PhaseTimeline
              currentPhaseIndex={currentPhaseIndex}
              phases={phases}
            />
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        <AmbienceControls
          activeSound={activeSound}
          volume={volume}
          onToggleSound={(id) => setActiveSound(activeSound === id ? null : id)}
          onVolumeChange={setVolume}
        />
      </div>
    </div>
  );
};
