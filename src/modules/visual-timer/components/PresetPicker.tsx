import React from 'react';
import { skupienie } from '../../../copy';
import { Button, Card, Heading, LabelText, Text } from '../../../components/ui';
import type { VisualTimerPreset } from '../types';
import { skupienieIds as ids } from '../testIds';

export interface PresetPickerProps {
  presets: VisualTimerPreset[];
  /** Ten sam wybór stoi na ekranie i w arkuszu — zakres rozróżnia identyfikatory. */
  scope: 'ekran' | 'arkusz';
  onStart: (presetId: string) => void;
}

/**
 * Wybór bloku pracy.
 *
 * Tego ekranu nie było wcale: moduł startował od zahardkodowanego Pomodoro,
 * a presety ze store'u nie miały jak trafić do interfejsu. Karta jest
 * typograficzna — duża liczba minut skupienia, pod nią rozpisane trzy fazy.
 */
export const PresetPicker: React.FC<PresetPickerProps> = ({ presets, scope, onStart }) => (
  <div data-testid={ids.presetPicker(scope)} className="flex flex-col gap-4">
    {presets.map((preset) => {
      const total = preset.warmupMinutes + preset.flowMinutes + preset.cooldownMinutes;

      return (
        <Card
          key={preset.id}
          as="article"
          data-testid={ids.presetCard(scope, preset.id)}
          className="p-card flex flex-col gap-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <Heading level={3}>{preset.title}</Heading>
              <Text
                size="sm"
                tone="muted"
                data-testid={ids.presetBreakdown(scope, preset.id)}
              >
                {skupienie.preset.breakdown(
                  preset.warmupMinutes,
                  preset.flowMinutes,
                  preset.cooldownMinutes
                )}
              </Text>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="numeric text-display-1 font-medium text-module-ink leading-none">
                {preset.flowMinutes}
              </span>
              <LabelText>{skupienie.preset.flowLabel}</LabelText>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Text size="xs" tone="faint">
              {skupienie.preset.total(total)}
            </Text>
            <Button
              variant="primary"
              tone="module"
              data-testid={ids.presetStart(scope, preset.id)}
              aria-label={skupienie.preset.startNamed(preset.title)}
              onClick={() => onStart(preset.id)}
            >
              {skupienie.action.start}
            </Button>
          </div>
        </Card>
      );
    })}
  </div>
);
