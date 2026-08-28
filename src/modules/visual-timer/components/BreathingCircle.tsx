import React, { useState, useEffect } from 'react';
import { cn } from '../../../lib/cn';

interface BreathingCircleProps {
  isActive?: boolean;
}

const TECHNIQUES = {
  box: {
    id: 'box',
    name: 'Box Breathing',
    phases: [
      { name: 'Wdech', duration: 4, action: 'expand', color: 'bg-emerald-400', glow: 'shadow-emerald-400/50' },
      { name: 'Zatrzymaj', duration: 4, action: 'hold-expanded', color: 'bg-emerald-600', glow: 'shadow-emerald-600/50' },
      { name: 'Wydech', duration: 4, action: 'contract', color: 'bg-sage-400', glow: 'shadow-sage-400/50' },
      { name: 'Spokój', duration: 4, action: 'hold-contracted', color: 'bg-sage-600', glow: 'shadow-sage-600/50' },
    ]
  },
  relax: {
    id: 'relax',
    name: 'Relaxing (4-7-8)',
    phases: [
      { name: 'Wdech', duration: 4, action: 'expand', color: 'bg-indigo-400', glow: 'shadow-indigo-400/50' },
      { name: 'Zatrzymaj', duration: 7, action: 'hold-expanded', color: 'bg-indigo-600', glow: 'shadow-indigo-600/50' },
      { name: 'Wydech', duration: 8, action: 'contract', color: 'bg-violet-400', glow: 'shadow-violet-400/50' },
    ]
  },
  flow: {
    id: 'flow',
    name: 'Calm Flow',
    phases: [
      { name: 'Wdech', duration: 4, action: 'expand', color: 'bg-cyan-400', glow: 'shadow-cyan-400/50' },
      { name: 'Wydech', duration: 6, action: 'contract', color: 'bg-sky-400', glow: 'shadow-sky-400/50' },
    ]
  }
};

type TechniqueKey = keyof typeof TECHNIQUES;

export const BreathingCircle: React.FC<BreathingCircleProps> = () => {
  const [activeTechKey, setActiveTechKey] = useState<TechniqueKey>('box');
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TECHNIQUES['box'].phases[0].duration);

  const technique = TECHNIQUES[activeTechKey];
  const currentPhase = technique.phases[phaseIndex];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Move to next phase
            const nextIndex = (phaseIndex + 1) % technique.phases.length;
            setPhaseIndex(nextIndex);
            return technique.phases[nextIndex].duration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, phaseIndex, technique]);

  const handleTechniqueChange = (key: TechniqueKey) => {
    setActiveTechKey(key);
    setIsRunning(false);
    setPhaseIndex(0);
    setTimeLeft(TECHNIQUES[key].phases[0].duration);
  };

  const toggleRun = () => setIsRunning(!isRunning);

  // Determine scale based on action
  let scaleClass = 'scale-100';
  if (isRunning) {
    if (currentPhase.action === 'expand') scaleClass = 'scale-[1.5]';
    else if (currentPhase.action === 'hold-expanded') scaleClass = 'scale-[1.5]';
    else if (currentPhase.action === 'contract') scaleClass = 'scale-100';
    else if (currentPhase.action === 'hold-contracted') scaleClass = 'scale-100';
  }

  // Animation duration matching phase duration
  const transitionDuration = isRunning && (currentPhase.action === 'expand' || currentPhase.action === 'contract') 
    ? `duration-[${currentPhase.duration * 1000}ms]`
    : 'duration-1000'; // Default fallback transition

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 min-h-[400px]">
      
      {/* Technique Selector */}
      <div className="flex gap-2 mb-12 bg-warmgray-100 dark:bg-warmgray-800 p-1 rounded-full">
        {(Object.keys(TECHNIQUES) as TechniqueKey[]).map(key => (
          <button
            key={key}
            onClick={() => handleTechniqueChange(key)}
            className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500',
                activeTechKey === key 
                  ? 'bg-white dark:bg-warmgray-700 text-warmgray-900 dark:text-white shadow-sm' 
                  : 'text-warmgray-500 hover:text-warmgray-700 dark:text-warmgray-400 dark:hover:text-warmgray-200'
              )
            }
          >
            {TECHNIQUES[key].name}
          </button>
        ))}
      </div>

      {/* Breathing Ring */}
      <button 
        onClick={toggleRun}
        className="relative w-64 h-64 flex items-center justify-center mb-12 focus:outline-none focus-visible:ring-4 focus-visible:ring-sage-500 rounded-full group"
        aria-label={isRunning ? 'Pause breathing' : 'Start breathing'}
      >
        {/* Outer Aura */}
        <div 
          className={cn(
              'absolute inset-0 rounded-full opacity-30 transition-all ease-in-out',
              isRunning ? 'animate-pulse' : '',
              currentPhase.color,
              scaleClass,
              transitionDuration
            )
          }
          style={{ 
            transitionDuration: isRunning && (currentPhase.action === 'expand' || currentPhase.action === 'contract') ? `${currentPhase.duration}s` : '1s'
          }}
        />
        
        {/* Middle Ring */}
        <div 
          className={cn(
              'absolute inset-4 rounded-full opacity-50 backdrop-blur-sm transition-all ease-in-out',
              currentPhase.color,
              scaleClass
            )
          }
          style={{ 
            transitionDuration: isRunning && (currentPhase.action === 'expand' || currentPhase.action === 'contract') ? `${currentPhase.duration}s` : '1s'
          }}
        />

        {/* Center Circle */}
        <div 
          className={cn(
              'relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all ease-in-out',
              currentPhase.color,
              currentPhase.glow,
              scaleClass
            )
          }
          style={{ 
            transitionDuration: isRunning && (currentPhase.action === 'expand' || currentPhase.action === 'contract') ? `${currentPhase.duration}s` : '1s'
          }}
        >
          {isRunning ? (
            <>
              <span className="text-4xl font-bold text-white tabular-nums tracking-tighter">
                {timeLeft}
              </span>
              <span className="text-xs font-medium text-white/80 mt-1 uppercase tracking-widest">
                sek
              </span>
            </>
          ) : (
            <span className="text-white font-medium group-hover:scale-110 transition-transform">
              Start
            </span>
          )}
        </div>
      </button>

      {/* Synchronized Text */}
      <div className="h-12 flex items-center justify-center">
        <p className={cn(
            "text-xl sm:text-2xl font-light transition-all duration-500 text-center",
            isRunning ? "text-warmgray-900 dark:text-white" : "text-warmgray-400"
          )
        }>
          {isRunning 
            ? `${currentPhase.name} (${currentPhase.duration}s)...` 
            : "Wybierz technikę i naciśnij Start"}
        </p>
      </div>
    </div>
  );
};
