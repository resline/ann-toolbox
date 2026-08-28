import React, { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { skupienie } from '../../../copy';
import { Button, LabelText, Text } from '../../../components/ui';
import { useMotionPreference } from '../../../lib/motion';
import { skupienieIds as ids } from '../testIds';

/*
 * Trzy techniki oddechu. Rytmy i kolejność faz zostają dokładnie takie, jakie
 * były — zmieniły się tylko kolory (tokeny zamiast emerald/indigo/cyan),
 * nazwy technik wyjechały do warstwy tekstów, a przy ograniczonym ruchu
 * okręgi się nie skalują.
 */
type BreathAction = 'expand' | 'hold-expanded' | 'contract' | 'hold-contracted';

interface BreathPhase {
  key: string;
  name: string;
  duration: number;
  action: BreathAction;
}

interface Technique {
  id: string;
  name: string;
  rhythm: string;
  phases: BreathPhase[];
}

const copy = skupienie.breathing;

const TECHNIQUES: Record<string, Technique> = {
  box: {
    id: 'box',
    name: copy.technique.box.name,
    rhythm: copy.technique.box.rhythm,
    phases: [
      { key: 'inhale', name: copy.phase.inhale, duration: 4, action: 'expand' },
      { key: 'hold', name: copy.phase.hold, duration: 4, action: 'hold-expanded' },
      { key: 'exhale', name: copy.phase.exhale, duration: 4, action: 'contract' },
      { key: 'rest', name: copy.phase.rest, duration: 4, action: 'hold-contracted' },
    ],
  },
  relax: {
    id: 'relax',
    name: copy.technique.relax.name,
    rhythm: copy.technique.relax.rhythm,
    phases: [
      { key: 'inhale', name: copy.phase.inhale, duration: 4, action: 'expand' },
      { key: 'hold', name: copy.phase.hold, duration: 7, action: 'hold-expanded' },
      { key: 'exhale', name: copy.phase.exhale, duration: 8, action: 'contract' },
    ],
  },
  flow: {
    id: 'flow',
    name: copy.technique.flow.name,
    rhythm: copy.technique.flow.rhythm,
    phases: [
      { key: 'inhale', name: copy.phase.inhale, duration: 4, action: 'expand' },
      { key: 'exhale', name: copy.phase.exhale, duration: 6, action: 'contract' },
    ],
  },
};

const TECHNIQUE_KEYS = ['box', 'relax', 'flow'] as const;
type TechniqueKey = (typeof TECHNIQUE_KEYS)[number];

export const BreathingCircle: React.FC = () => {
  const { reduced } = useMotionPreference();
  const [activeTechKey, setActiveTechKey] = useState<TechniqueKey>('box');
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState({
    phaseIndex: 0,
    timeLeft: TECHNIQUES.box.phases[0].duration,
  });

  const technique = TECHNIQUES[activeTechKey];
  const currentPhase = technique.phases[step.phaseIndex];

  /*
   * Faza i pozostałe sekundy siedzą w jednym stanie, aktualizowanym funkcyjnie.
   * To nie ozdoba: przy dwóch osobnych stanach tik, który wypada między
   * renderami, liczyłby od nieaktualnej wartości. Po ostatniej sekundzie fazy
   * od razu wchodzi kolejna, więc licznik nigdy nie pokazuje zera — dokładnie
   * jak wcześniej.
   */
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev.timeLeft > 1) return { ...prev, timeLeft: prev.timeLeft - 1 };
        const nextIndex = (prev.phaseIndex + 1) % technique.phases.length;
        return { phaseIndex: nextIndex, timeLeft: technique.phases[nextIndex].duration };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, technique]);

  const handleTechniqueChange = (key: TechniqueKey) => {
    setActiveTechKey(key);
    setIsRunning(false);
    setStep({ phaseIndex: 0, timeLeft: TECHNIQUES[key].phases[0].duration });
  };

  const expanded =
    isRunning && (currentPhase.action === 'expand' || currentPhase.action === 'hold-expanded');
  const moving =
    isRunning && (currentPhase.action === 'expand' || currentPhase.action === 'contract');

  // Przy ograniczonym ruchu okręgi stoją — informację niesie nazwa fazy i licznik.
  const ringStyle: React.CSSProperties = reduced
    ? {}
    : {
        transform: expanded ? 'scale(1.35)' : 'scale(1)',
        transitionDuration: moving ? `${currentPhase.duration}s` : '1s',
      };

  return (
    <div data-testid={ids.breathing} className="flex flex-col items-center gap-8">
      <div
        role="group"
        aria-label={copy.techniqueLabel}
        className="grid grid-cols-3 gap-2 w-full"
      >
        {TECHNIQUE_KEYS.map((key) => {
          const isActive = activeTechKey === key;
          return (
            <Button
              key={key}
              data-testid={ids.breathingTechnique(key)}
              variant={isActive ? 'secondary' : 'quiet'}
              tone={isActive ? 'module' : 'neutral'}
              aria-pressed={isActive}
              onClick={() => handleTechniqueChange(key)}
              className="h-auto flex-col gap-1 py-3 px-2 min-h-tap"
            >
              <span className="text-sm font-medium leading-tight">{TECHNIQUES[key].name}</span>
              <span className="numeric text-xs font-normal text-ink-faint">
                {TECHNIQUES[key].rhythm}
              </span>
            </Button>
          );
        })}
      </div>

      <button
        type="button"
        data-testid={ids.breathingToggle}
        aria-label={isRunning ? copy.pause : copy.start}
        aria-pressed={isRunning}
        onClick={() => setIsRunning((prev) => !prev)}
        className={cn(
          'relative block w-full max-w-[16rem] aspect-square rounded-full',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))]'
        )}
      >
        <span
          aria-hidden
          style={ringStyle}
          className="absolute inset-0 rounded-full bg-module/10 transition-transform ease-in-out"
        />
        <span
          aria-hidden
          style={ringStyle}
          className="absolute inset-8 rounded-full bg-module/20 transition-transform ease-in-out"
        />
        <span
          aria-hidden
          style={ringStyle}
          className="absolute inset-[30%] rounded-full bg-module-soft shadow-hairline transition-transform ease-in-out"
        />

        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <LabelText tone="module" data-testid={ids.breathingPhase}>
            {isRunning ? currentPhase.name : technique.name}
          </LabelText>
          {isRunning ? (
            <>
              <span
                data-testid={ids.breathingCount}
                className="numeric text-display-1 font-medium text-ink leading-none"
              >
                {step.timeLeft}
              </span>
              <LabelText>{copy.seconds}</LabelText>
            </>
          ) : (
            <span className="text-base font-medium text-ink">{skupienie.action.start}</span>
          )}
        </span>
      </button>

      <span className="sr-only" aria-live="polite">
        {isRunning ? copy.countLabel(currentPhase.name) : ''}
      </span>

      <Text size="sm" tone="faint" className="text-center max-w-xs">
        {isRunning ? technique.rhythm : copy.idle}
      </Text>
    </div>
  );
};
