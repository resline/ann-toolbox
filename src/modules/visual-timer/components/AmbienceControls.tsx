import React from 'react';
import { CloudRain, Music, Volume2, VolumeX, Waves } from '../../../lib/icons';
import type { LucideIcon } from '../../../lib/icons';
import { cn } from '../../../lib/cn';
import { skupienie } from '../../../copy';
import { Button, Card, LabelText, Slider, Text } from '../../../components/ui';
import type { SensoryAmbience } from '../types';
import { skupienieIds as ids } from '../testIds';

export interface AmbienceControlsProps {
  active: SensoryAmbience;
  volume: number;
  supported: boolean;
  onToggle: (sound: SensoryAmbience) => void;
  onVolumeChange: (percent: number) => void;
}

/*
 * Trzy dźwięki, a nie pięć: „las" i „fale" z typu SensoryAmbience audio.ts
 * syntezuje tym samym szumem brązowym, więc jako osobne przyciski byłyby
 * obietnicą bez pokrycia.
 */
const SOUNDS: Array<{ id: SensoryAmbience; label: string; icon: LucideIcon }> = [
  { id: 'rain', label: skupienie.ambience.sound.rain, icon: CloudRain },
  { id: 'brown-noise', label: skupienie.ambience.sound.brown, icon: Waves },
  { id: 'pink-noise', label: skupienie.ambience.sound.pink, icon: Music },
];

export const AmbienceControls: React.FC<AmbienceControlsProps> = ({
  active,
  volume,
  supported,
  onToggle,
  onVolumeChange,
}) => (
  <Card data-testid={ids.ambience} className="p-card flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3">
      <LabelText>{skupienie.ambience.title}</LabelText>
      <span className="text-ink-faint" aria-hidden>
        {volume === 0 || active === 'none' ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </span>
    </div>

    <div className="grid grid-cols-3 gap-2">
      {SOUNDS.map((sound) => {
        const Icon = sound.icon;
        const isActive = active === sound.id;

        return (
          <Button
            key={sound.id}
            data-testid={ids.ambienceSound(sound.id)}
            variant={isActive ? 'secondary' : 'quiet'}
            tone={isActive ? 'module' : 'neutral'}
            aria-pressed={isActive}
            onClick={() => onToggle(sound.id)}
            className={cn('h-auto flex-col gap-2 py-3 px-2 min-h-tap')}
          >
            <Icon className="w-5 h-5" aria-hidden />
            <span className="text-xs font-normal leading-tight text-center">{sound.label}</span>
          </Button>
        );
      })}
    </div>

    <div data-testid={ids.ambienceVolume}>
      <Slider
        value={volume}
        onValueChange={onVolumeChange}
        label={skupienie.ambience.volume}
        valueText={skupienie.ambience.volumeValue(volume)}
      />
    </div>

    {!supported ? (
      <Text size="xs" tone="faint" data-testid={ids.ambienceNotice}>
        {skupienie.ambience.unsupported}
      </Text>
    ) : active !== 'none' ? (
      <Text size="xs" tone="faint">
        {skupienie.ambience.hint}
      </Text>
    ) : null}
  </Card>
);
