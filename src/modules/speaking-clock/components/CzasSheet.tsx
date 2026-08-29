import React, { useState } from 'react';
import { Volume2 } from '../../../lib/icons';
import { czas, common } from '../../../copy';
import {
  Button,
  Divider,
  LabelText,
  RadioCards,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  Slider,
  Stack,
  Switch,
  Text,
  SegmentedTabs,
} from '../../../components/ui';
import type {
  ChimeTone,
  DepartureSettings,
  SpeakingClockSettings,
  TimeFormatStyle,
  TimeTimerColor,
} from '../types';
import { czasIds } from '../testIds';
import { DepartureConfig } from './DepartureConfig';

type SheetTab = 'mode' | 'voice' | 'dial';
type Direction = 'clockwise' | 'counter-clockwise';

export interface CzasSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: SpeakingClockSettings;
  voicePackStatus: 'loading' | 'ready' | 'failed';
  isTestingVoice?: boolean;
  onUpdateSettings: (patch: Partial<SpeakingClockSettings>) => void;
  onDepartureChange: (patch: Partial<DepartureSettings>) => void;
  onTestVoice: () => void | Promise<void>;
  disabled?: boolean;
}

const INTERVALS = [1, 2, 5, 10, 15, 30, 60];
const FOCUS_LENGTHS = [15, 25, 45, 60];
const DIAL_COLORS: TimeTimerColor[] = ['sage', 'amber', 'lavender', 'rose', 'ocean'];

/**
 * Jeden arkusz zamiast dwóch miejsc na ustawienia.
 *
 * Wcześniej część ustawień żyła w modalu (602 linie, pięć sekcji), a część
 * w konfiguracji wyjścia renderowanej nad tarczą na ekranie głównym. Ta sama
 * treść, ale bez pytania „gdzie to było".
 */
export const CzasSheet: React.FC<CzasSheetProps> = ({
  open,
  onOpenChange,
  settings,
  voicePackStatus,
  isTestingVoice = false,
  onUpdateSettings,
  onDepartureChange,
  onTestVoice,
  disabled = false,
}) => {
  const [tab, setTab] = useState<SheetTab>('mode');

  const pill = (active: boolean) =>
    [
      'min-h-tap px-3.5 rounded-control text-sm font-medium transition-colors',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]',
      'disabled:opacity-50',
      active
        ? 'bg-module-soft text-module-ink shadow-[0_0_0_1px_rgb(var(--module))]'
        : 'bg-surface-sunken text-ink-muted hover:bg-surface-hover',
    ].join(' ');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="full" className={undefined}>
        <SheetHeader title={czas.sheet.title} closeLabel={common.action.close} />
        <div data-testid={czasIds.sheet} className="px-gutter pb-3">
          <SegmentedTabs<SheetTab>
            label={czas.sheet.title}
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'mode', label: czas.sheet.tabMode, testId: czasIds.sheetTab('mode') },
              { value: 'voice', label: czas.sheet.tabVoice, testId: czasIds.sheetTab('voice') },
              { value: 'dial', label: czas.sheet.tabDial, testId: czasIds.sheetTab('dial') },
            ]}
          />
        </div>

        <SheetBody>
          {/* ── ten tryb ── */}
          {tab === 'mode' && (
            <Stack gap="lg" className="pb-6">
              {settings.mode === 'continuous' && (
                <Stack gap="sm">
                  <LabelText>{czas.interval.label}</LabelText>
                  <div className="flex flex-wrap gap-2">
                    {INTERVALS.map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        data-testid={czasIds.intervalPreset(minutes)}
                        onClick={() => onUpdateSettings({ intervalMinutes: minutes })}
                        aria-pressed={settings.intervalMinutes === minutes}
                        className={pill(settings.intervalMinutes === minutes)}
                      >
                        {czas.departure.every(minutes)}
                      </button>
                    ))}
                  </div>
                </Stack>
              )}

              {settings.mode === 'focus' && (
                <Stack gap="sm">
                  <LabelText>{czas.focus.length}</LabelText>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_LENGTHS.map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        data-testid={czasIds.focusLength(minutes)}
                        onClick={() => onUpdateSettings({ focusDurationMinutes: minutes })}
                        disabled={disabled}
                        aria-pressed={settings.focusDurationMinutes === minutes}
                        className={pill(settings.focusDurationMinutes === minutes)}
                      >
                        {czas.departure.every(minutes).replace('Co ', '')}
                      </button>
                    ))}
                  </div>
                </Stack>
              )}

              {settings.mode === 'departure' && (
                <DepartureConfig
                  settings={settings.departure}
                  onChange={onDepartureChange}
                  disabled={disabled}
                  cadenceDisabled={false}
                />
              )}

              <Divider />

              <Switch
                label={czas.sheet.clockSync}
                hint={czas.sheet.clockSyncHint}
                checked={settings.clockSync}
                onCheckedChange={(checked) => onUpdateSettings({ clockSync: checked })}
                disabled={disabled}
              />
              <Switch
                label={czas.sheet.keepAwake}
                hint={czas.sheet.keepAwakeHint}
                checked={settings.keepAwake}
                onCheckedChange={(checked) => onUpdateSettings({ keepAwake: checked })}
              />
            </Stack>
          )}

          {/* ── głos ── */}
          {tab === 'voice' && (
            <Stack gap="lg" className="pb-6">
              <Stack gap="xs">
                <LabelText>{czas.sheet.voice}</LabelText>
                <Text size="sm">{czas.sheet.offlineVoice}</Text>
                <Text size="xs" tone="faint">
                  {voicePackStatus === 'ready'
                    ? czas.sheet.offlineVoiceReady
                    : voicePackStatus === 'loading'
                      ? czas.notice.voiceLoading
                      : czas.sheet.voiceMissing}
                </Text>
              </Stack>

              <Stack gap="sm">
                <LabelText>{czas.sheet.style}</LabelText>
                <RadioCards<TimeFormatStyle>
                  label={czas.sheet.style}
                  value={settings.formatStyle}
                  onValueChange={(formatStyle) => onUpdateSettings({ formatStyle })}
                  options={(Object.keys(czas.sheet.styleOptions) as TimeFormatStyle[]).map((key) => ({
                    value: key,
                    label: czas.sheet.styleOptions[key].label,
                    description: czas.sheet.styleOptions[key].hint,
                  }))}
                />
              </Stack>

              <Stack gap="sm">
                <LabelText>{czas.sheet.volume}</LabelText>
                <Slider
                  label={czas.sheet.volume}
                  value={Math.round(settings.volume * 100)}
                  onValueChange={(value) => onUpdateSettings({ volume: value / 100 })}
                  valueText={`${Math.round(settings.volume * 100)}%`}
                />
              </Stack>

              <Button
                variant="secondary"
                tone="module"
                onClick={onTestVoice}
                loading={isTestingVoice}
                disabled={voicePackStatus !== 'ready'}
                data-testid={czasIds.secondaryAction}
              >
                <Volume2 className="w-4 h-4" aria-hidden />
                {czas.action.testVoice}
              </Button>

              <Divider />

              <Switch
                label={czas.sheet.chime}
                hint={czas.sheet.chimeHint}
                checked={settings.chimeEnabled}
                onCheckedChange={(chimeEnabled) => onUpdateSettings({ chimeEnabled })}
              />
              {settings.chimeEnabled && (
                <Stack gap="sm">
                  <LabelText>{czas.sheet.chimeTone}</LabelText>
                  <RadioCards<ChimeTone>
                    label={czas.sheet.chimeTone}
                    columns={3}
                    value={settings.chimeTone}
                    onValueChange={(chimeTone) => onUpdateSettings({ chimeTone })}
                    options={(Object.keys(czas.sheet.chimeTones) as ChimeTone[]).map((key) => ({
                      value: key,
                      label: czas.sheet.chimeTones[key],
                    }))}
                  />
                  <LabelText>{czas.sheet.chimeVolume}</LabelText>
                  <Slider
                    label={czas.sheet.chimeVolume}
                    value={Math.round(settings.chimeVolume * 100)}
                    onValueChange={(value) => onUpdateSettings({ chimeVolume: value / 100 })}
                    valueText={`${Math.round(settings.chimeVolume * 100)}%`}
                  />
                </Stack>
              )}
            </Stack>
          )}

          {/* ── tarcza ── */}
          {tab === 'dial' && (
            <Stack gap="lg" className="pb-6">
              <Stack gap="sm">
                <LabelText>{czas.sheet.dialColor}</LabelText>
                <RadioCards<TimeTimerColor>
                  label={czas.sheet.dialColor}
                  value={settings.timeTimer.color}
                  onValueChange={(color) =>
                    onUpdateSettings({ timeTimer: { ...settings.timeTimer, color } })
                  }
                  options={DIAL_COLORS.map((color) => ({
                    value: color,
                    label: czas.sheet.dialColors[color],
                    preview: (
                      <span
                        className="block w-8 h-8 rounded-full shadow-hairline"
                        style={{ backgroundColor: `rgb(var(--disc-${color}-from))` }}
                        aria-hidden
                      />
                    ),
                  }))}
                />
              </Stack>

              <Switch
                label={czas.sheet.dialNumbers}
                hint={czas.sheet.dialNumbersHint}
                checked={settings.timeTimer.showNumbers}
                onCheckedChange={(showNumbers) =>
                  onUpdateSettings({ timeTimer: { ...settings.timeTimer, showNumbers } })
                }
              />

              <Stack gap="sm">
                <LabelText>{czas.sheet.dialDirection}</LabelText>
                <RadioCards<Direction>
                  label={czas.sheet.dialDirection}
                  columns={2}
                  value={settings.timeTimer.direction}
                  onValueChange={(direction) =>
                    onUpdateSettings({ timeTimer: { ...settings.timeTimer, direction } })
                  }
                  options={[
                    { value: 'counter-clockwise', label: czas.sheet.dialDirections['counter-clockwise'] },
                    { value: 'clockwise', label: czas.sheet.dialDirections.clockwise },
                  ]}
                />
              </Stack>
            </Stack>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};

export default CzasSheet;
