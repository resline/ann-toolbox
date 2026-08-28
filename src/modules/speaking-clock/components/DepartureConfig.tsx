import React, { useRef } from 'react';
import { cn } from '../../../lib/cn';
import { czas } from '../../../copy';
import { Field, Input, LabelText, Stack, Text } from '../../../components/ui';
import type { DepartureSettings } from '../types';
import { czasIds } from '../testIds';

export interface DepartureConfigProps {
  settings: DepartureSettings;
  onChange: (settings: Partial<DepartureSettings>) => void;
  disabled?: boolean;
  className?: string;
}

const FIXED_CADENCES = [1, 2, 3, 5, 10, 15];

/**
 * Ustawienia trybu „do wyjścia".
 *
 * Wcześniej ta sekcja leżała NAD tarczą na ekranie głównym i miała sześć bloków,
 * przez co tarcza była około 500 px poniżej zgięcia ekranu. Teraz mieszka
 * w arkuszu ustawień, a na ekranie zostaje jeden cichy wiersz podsumowania.
 */
export const DepartureConfig: React.FC<DepartureConfigProps> = ({
  settings,
  onChange,
  disabled = false,
  className = '',
}) => {
  const customInputRef = useRef<HTMLInputElement>(null);

  const handleRelativeTime = (offsetMinutes: number) => {
    const future = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const hours = String(future.getHours()).padStart(2, '0');
    const mins = String(future.getMinutes()).padStart(2, '0');
    onChange({ targetTime: `${hours}:${mins}` });
  };

  const isCustomLabel = !czas.departure.presets.includes(settings.label as never);

  const pill = (active: boolean) =>
    cn(
      'min-h-tap px-3.5 rounded-control text-sm font-medium transition-colors',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      active
        ? 'bg-module-soft text-module-ink shadow-[0_0_0_1px_rgb(var(--module))]'
        : 'bg-surface-sunken text-ink-muted hover:bg-surface-hover'
    );

  return (
    <Stack gap="lg" className={className}>
      {/* godzina docelowa */}
      <Stack gap="sm">
        <Field label={czas.departure.time}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              data-testid={czasIds.departureTime}
              type="time"
              value={settings.targetTime}
              onChange={(event) => onChange({ targetTime: event.target.value })}
              disabled={disabled}
              className="numeric text-2xl"
            />
          )}
        </Field>

        <div>
          <LabelText>{czas.departure.quickAdd}</LabelText>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {czas.departure.offsets.map((offset) => (
              <button
                key={offset.minutes}
                type="button"
                data-testid={czasIds.departureOffset(offset.minutes)}
                onClick={() => handleRelativeTime(offset.minutes)}
                disabled={disabled}
                className={pill(false)}
              >
                {offset.label}
              </button>
            ))}
          </div>
        </div>
      </Stack>

      {/* po co wychodzisz */}
      <Stack gap="sm">
        <LabelText>{czas.departure.label}</LabelText>
        <div className="flex flex-wrap gap-2">
          {czas.departure.presets.map((preset, index) => (
            <button
              key={preset}
              type="button"
              data-testid={czasIds.departurePreset(index)}
              onClick={() => onChange({ label: preset })}
              disabled={disabled}
              aria-pressed={settings.label === preset}
              className={pill(settings.label === preset)}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            data-testid={czasIds.departureCustomButton}
            onClick={() => customInputRef.current?.focus()}
            disabled={disabled}
            aria-pressed={isCustomLabel}
            className={pill(isCustomLabel)}
          >
            {czas.departure.custom}
          </button>
        </div>
        <Field label={czas.departure.labelPlaceholder} hideLabel>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              ref={customInputRef}
              data-testid={czasIds.departureCustom}
              value={settings.label}
              onChange={(event) => onChange({ label: event.target.value })}
              disabled={disabled}
              aria-label={czas.departure.labelPlaceholder}
            />
          )}
        </Field>
      </Stack>

      {/* kadencja przypomnień */}
      <Stack gap="sm">
        <LabelText>{czas.departure.cadence}</LabelText>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid={czasIds.cadenceSmart}
            onClick={() => onChange({ smartDensity: true })}
            disabled={disabled}
            aria-pressed={settings.smartDensity}
            className={pill(settings.smartDensity)}
          >
            {czas.departure.smart}
          </button>
          {FIXED_CADENCES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              data-testid={czasIds.cadenceFixed(minutes)}
              onClick={() => onChange({ smartDensity: false, intervalMinutes: minutes })}
              disabled={disabled}
              aria-pressed={!settings.smartDensity && settings.intervalMinutes === minutes}
              className={pill(!settings.smartDensity && settings.intervalMinutes === minutes)}
            >
              {czas.departure.every(minutes)}
            </button>
          ))}
        </div>
        {settings.smartDensity && (
          <Text size="xs" tone="faint">
            {czas.departure.smartHint}
          </Text>
        )}
      </Stack>
    </Stack>
  );
};

export default DepartureConfig;
