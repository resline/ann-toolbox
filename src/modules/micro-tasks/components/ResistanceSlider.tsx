import React from 'react';
import { Slider, Text, LabelText } from '../../../components/ui';
import { start } from '../../../copy';
import { startIds } from '../testIds';

export type ResistanceLevel = 1 | 2 | 3 | 4 | 5;

export interface ResistanceSliderProps {
  level: ResistanceLevel;
  onChange: (level: ResistanceLevel) => void;
}

function toLevel(value: number): ResistanceLevel {
  const clamped = Math.min(5, Math.max(1, Math.round(value)));
  return clamped as ResistanceLevel;
}

/**
 * Poziom oporu steruje tym, jak drobne mają być kroki.
 *
 * Opis pod suwakiem jest jednym zdaniem — nie akapitem — bo ten ekran ma
 * odejmować przytłoczenia, a nie dokładać czytania.
 */
export const ResistanceSlider: React.FC<ResistanceSliderProps> = ({ level, onChange }) => {
  const copy = start.decomposer.resistance;
  const info = copy.levels[level];

  return (
    <div className="flex flex-col gap-3" data-testid={startIds.decomposerResistance}>
      <Text size="base">{copy.label}</Text>

      <Slider
        value={level}
        onValueChange={(value) => onChange(toLevel(value))}
        min={1}
        max={5}
        step={1}
        label={copy.label}
        valueText={info.name}
      />

      <div
        className="flex flex-col gap-1 rounded-card bg-surface-sunken px-card py-3"
        data-testid={startIds.decomposerResistanceNote}
        aria-live="polite"
      >
        <LabelText tone="module">{info.name}</LabelText>
        <Text size="sm" tone="muted">
          {info.hint}
        </Text>
      </div>
    </div>
  );
};
