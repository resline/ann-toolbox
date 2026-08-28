/**
 * Moduł Czas.
 *
 * Układ ekranu w stanie spoczynku to cztery elementy: przełącznik trybu,
 * tarcza, jeden cichy wiersz podsumowania i jedna akcja główna.
 *
 * Wcześniej w trybie „do wyjścia" nad tarczą stały nagłówek modułu, trzy kafle
 * trybów ułożone pionowo i sześciosekcyjny formularz — tarcza lądowała około
 * 500 px poniżej zgięcia ekranu, choć jest jedynym powodem, dla którego się tu
 * wchodzi.
 *
 * Silniki (odliczanie w tle, mowa, gong, fleksja) pozostają nietknięte.
 */

import React, { useState } from 'react';
import { ChevronRight, Pause, Play, Square } from '../../lib/icons';
import { cn } from '../../lib/cn';
import { common, czas } from '../../copy';
import { Badge, Button, Stack, Text } from '../../components/ui';
import { useSpeakingClock } from './hooks/useSpeakingClock';
import { ModeTabs } from './components/ModeTabs';
import { TimeTimerDisc } from './components/TimeTimerDisc';
import { QuickTimeAdjusters } from './components/QuickTimeAdjusters';
import { CzasSheet } from './components/CzasSheet';
import { czasIds } from './testIds';

export interface SpeakingClockModuleProps {
  className?: string;
}

/** Sekundy → MM:SS albo H:MM:SS. */
function formatSecondsToDigital(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export const SpeakingClockModule: React.FC<SpeakingClockModuleProps> = ({ className = '' }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const {
    clockState,
    currentTime,
    secondsUntilNext,
    settings,
    availableVoices,
    isLoadingVoices,
    isTestingVoice,
    totalSpanSeconds,
    secondsRemaining,
    departureLabel,
    targetTime,
    start,
    pause,
    resume,
    stop,
    updateSettings,
    setDepartureSettings,
    testVoiceNow,
    setMode,
    addMinutes,
  } = useSpeakingClock();

  const isRunning = clockState === 'running';
  const isPaused = clockState === 'paused';
  const isIdle = clockState === 'idle';

  // Silnik nie eskaluje braku głosu, a użytkowniczka wciska Start i słyszy ciszę.
  // Tego da się uniknąć bez wchodzenia w silnik: hook już wie, ile głosów znalazł.
  const hasNoPolishVoice = !isLoadingVoices && availableVoices.length === 0;

  let discLabel: string = czas.disc.clock;
  let discValue = formatClock(currentTime);
  let discSublabel: string = czas.disc.everyMinutes(settings.intervalMinutes);

  if (settings.mode === 'departure') {
    discLabel = czas.disc.departure;
    discValue = formatSecondsToDigital(secondsRemaining);
    discSublabel = departureLabel || czas.departure.presets[0];
  } else if (settings.mode === 'focus') {
    discLabel = czas.disc.focus;
    discValue = formatSecondsToDigital(secondsRemaining);
    discSublabel = czas.disc.focusLength(settings.focusDurationMinutes);
  } else if (isRunning || isPaused) {
    discLabel = czas.disc.next;
    discValue = formatSecondsToDigital(secondsUntilNext);
  }

  const cadence =
    settings.mode === 'departure'
      ? settings.departure.smartDensity
        ? czas.departure.smart
        : czas.departure.every(settings.departure.intervalMinutes ?? 2)
      : settings.mode === 'focus'
      ? czas.disc.focusLength(settings.focusDurationMinutes)
      : czas.disc.everyMinutes(settings.intervalMinutes);

  const summary =
    settings.mode === 'departure'
      ? [departureLabel, targetTime, cadence].filter(Boolean).join(' · ')
      : cadence;

  return (
    <Stack gap="lg" className={cn('py-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <ModeTabs
          activeMode={settings.mode}
          onModeChange={setMode}
          disabled={!isIdle}
          className="flex-1"
        />
      </div>

      {hasNoPolishVoice && (
        <Text data-testid={czasIds.noVoiceNotice} size="sm" tone="muted" className="text-center">
          {czas.notice.noPolishVoice}
        </Text>
      )}

      {/* tarcza — pierwsza rzecz pod przełącznikiem, zawsze nad zgięciem ekranu */}
      <div className="flex justify-center">
        <TimeTimerDisc
          totalSeconds={totalSpanSeconds}
          secondsRemaining={secondsRemaining}
          color={settings.timeTimer.color}
          showNumbers={settings.timeTimer.showNumbers}
          direction={settings.timeTimer.direction}
          isActive={isRunning}
          centerLabel={discLabel}
          centerTimeText={discValue}
          centerSublabel={discSublabel}
        />
      </div>

      {/* jeden cichy wiersz: jest etykietą i przyciskiem naraz */}
      <button
        type="button"
        data-testid={czasIds.settingsRow}
        onClick={() => setIsSheetOpen(true)}
        aria-label={czas.action.openSettings}
        className={cn(
          'w-full min-h-tap flex items-center justify-between gap-3 px-3 rounded-control',
          'text-left text-sm text-ink-muted transition-colors hover:bg-surface-hover',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]'
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-ink-faint" aria-hidden />
      </button>

      {(isRunning || isPaused) && settings.mode !== 'continuous' && (
        <QuickTimeAdjusters onAdjustMinutes={addMinutes} />
      )}

      {/* jedna akcja główna, pełna szerokość */}
      <Stack gap="sm">
        {isIdle && (
          <Button
            data-testid={czasIds.primaryAction}
            variant="primary"
            tone="module"
            size="lg"
            onClick={start}
          >
            <Play className="w-5 h-5" aria-hidden />
            {common.action.start}
          </Button>
        )}

        {isRunning && (
          <div className="flex gap-2">
            <Button variant="secondary" tone="module" size="lg" onClick={pause} className="flex-1">
              <Pause className="w-5 h-5" aria-hidden />
              {common.action.pause}
            </Button>
            <Button
              data-testid={czasIds.primaryAction}
              variant="quiet"
              tone="neutral"
              size="lg"
              onClick={stop}
              className="flex-1"
            >
              <Square className="w-5 h-5" aria-hidden />
              {common.action.stop}
            </Button>
          </div>
        )}

        {isPaused && (
          <div className="flex gap-2">
            <Button
              data-testid={czasIds.primaryAction}
              variant="primary"
              tone="module"
              size="lg"
              onClick={resume}
              className="flex-1"
            >
              <Play className="w-5 h-5" aria-hidden />
              {common.action.resume}
            </Button>
            <Button variant="quiet" tone="neutral" size="lg" onClick={stop} className="flex-1">
              <Square className="w-5 h-5" aria-hidden />
              {common.action.stop}
            </Button>
          </div>
        )}

        <div className="flex justify-center">
          <Badge
            data-testid={czasIds.statusBadge}
            tone={isRunning ? 'module' : isPaused ? 'caution' : 'neutral'}
          >
            {isRunning ? czas.state.running : isPaused ? czas.state.paused : czas.state.idle}
          </Badge>
        </div>
      </Stack>

      <CzasSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        settings={settings}
        availableVoices={availableVoices}
        isLoadingVoices={isLoadingVoices}
        isTestingVoice={isTestingVoice}
        onUpdateSettings={updateSettings}
        onDepartureChange={setDepartureSettings}
        onTestVoice={testVoiceNow}
        disabled={!isIdle}
      />
    </Stack>
  );
};

export default SpeakingClockModule;
