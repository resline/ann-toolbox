import React, { useEffect, useRef, useState } from 'react';
import { Circle, Clock, Settings2 } from '../../../lib/icons';
import { formatDuration } from '../../../lib/time/formatDuration';
import { common, skupienie } from '../../../copy';
import {
  Badge,
  Button,
  Divider,
  EmptyState,
  IconButton,
  SegmentedTabs,
  Section,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  Stack,
  Switch,
  TabPanel,
  Text,
} from '../../../components/ui';
import { useVisualTimerStore } from '../store';
import { useAmbience } from '../useAmbience';
import { skupienieIds as ids } from '../testIds';
import type { TimerPhase } from '../types';
import { AmbienceControls } from './AmbienceControls';
import { BreathingCircle } from './BreathingCircle';
import { MultiPhaseProgressDisc } from './MultiPhaseProgressDisc';
import { PhaseTimeline, type TimelineItem } from './PhaseTimeline';
import { PresetPicker } from './PresetPicker';

type ModeKey = 'sesja' | 'oddech';

/**
 * Skupienie.
 *
 * Moduł stał wcześniej na zaślepce: cztery fazy Pomodoro w useState, własny
 * setInterval i sesja znikająca po odświeżeniu strony. Store z fazami
 * rozgrzewka → skupienie → wyciszenie leżał obok, nieużywany. Teraz cały stan
 * biegu pochodzi ze store'u, a komponent dokłada wyłącznie tykanie zegara.
 */
export const VisualTimerModule: React.FC = () => {
  const presets = useVisualTimerStore((s) => s.presets);
  const activePresetId = useVisualTimerStore((s) => s.activePresetId);
  const currentPhase = useVisualTimerStore((s) => s.currentPhase);
  const timeRemainingSeconds = useVisualTimerStore((s) => s.timeRemainingSeconds);
  const totalPhaseSeconds = useVisualTimerStore((s) => s.totalPhaseSeconds);
  const isRunning = useVisualTimerStore((s) => s.isRunning);
  const startTimer = useVisualTimerStore((s) => s.startTimer);
  const pauseTimer = useVisualTimerStore((s) => s.pauseTimer);
  const resumeTimer = useVisualTimerStore((s) => s.resumeTimer);
  const stopTimer = useVisualTimerStore((s) => s.stopTimer);
  const skipPhase = useVisualTimerStore((s) => s.skipPhase);
  const tick = useVisualTimerStore((s) => s.tick);

  const [mode, setMode] = useState<ModeKey>('sesja');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoSound, setAutoSound] = useState(false);

  const ambience = useAmbience();
  const { stop: stopAmbience } = ambience;
  /** Czy to sesja włączyła dźwięk — tylko wtedy sama go gasi na końcu. */
  const soundStartedBySession = useRef(false);

  // Jedyny zegar w module. Store liczy, komponent tylko go trąca.
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  // Koniec sesji — czy przez „Zatrzymaj", czy przez wyczerpanie ostatniej fazy.
  useEffect(() => {
    if (currentPhase === null && soundStartedBySession.current) {
      soundStartedBySession.current = false;
      stopAmbience();
    }
  }, [currentPhase, stopAmbience]);

  const activePreset = presets.find((preset) => preset.id === activePresetId) ?? null;

  const handleStart = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    startTimer(presetId);
    setSettingsOpen(false);

    // Wciąż jesteśmy w geście dotknięcia — tylko tutaj iOS pozwoli odblokować
    // AudioContext, więc dźwięk startuje dokładnie w tym miejscu.
    if (autoSound && preset && preset.ambience !== 'none') {
      soundStartedBySession.current = true;
      ambience.play(preset.ambience);
    }
  };

  // Dotknięcie przycisku dźwięku odbiera sesji prawo do gaszenia go na końcu —
  // od tej chwili tłem steruje użytkowniczka, nie licznik.
  const handleAmbienceToggle = (sound: Parameters<typeof ambience.toggle>[0]) => {
    soundStartedBySession.current = false;
    ambience.toggle(sound);
  };

  const progress =
    totalPhaseSeconds > 0
      ? ((totalPhaseSeconds - timeRemainingSeconds) / totalPhaseSeconds) * 100
      : 0;

  const timelineItems: TimelineItem[] = activePreset
    ? (
        [
          ['warmup', activePreset.warmupMinutes],
          ['flow', activePreset.flowMinutes],
          ['cooldown', activePreset.cooldownMinutes],
        ] as Array<[TimerPhase, number]>
      ).map(([phase, minutes]) => ({
        phase,
        label: skupienie.phase[phase],
        minutesLabel: skupienie.timeline.minutes(minutes),
        weight: Math.max(1, minutes),
      }))
    : [];

  const sessionView = currentPhase ? (
    <Stack gap="lg">
      <MultiPhaseProgressDisc
        progress={progress}
        phaseLabel={skupienie.phase[currentPhase]}
        timeLeft={formatDuration(timeRemainingSeconds)}
        totalLabel={skupienie.disc.ofTotal(Math.round(totalPhaseSeconds / 60))}
        progressLabel={skupienie.disc.progressLabel(skupienie.phase[currentPhase])}
        paused={!isRunning}
      />

      <Text size="sm" tone="muted" className="text-center" data-testid={ids.phaseHint}>
        {skupienie.phaseHint[currentPhase]}
      </Text>

      <Stack gap="sm">
        <Button
          variant="primary"
          tone="module"
          size="lg"
          data-testid={ids.primaryAction}
          onClick={isRunning ? pauseTimer : resumeTimer}
        >
          {isRunning ? skupienie.action.pause : skupienie.action.resume}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="quiet"
            tone="neutral"
            className="flex-1"
            data-testid={ids.skipAction}
            onClick={skipPhase}
          >
            {skupienie.action.skip}
          </Button>
          <Button
            variant="quiet"
            tone="neutral"
            className="flex-1"
            data-testid={ids.stopAction}
            onClick={stopTimer}
          >
            {skupienie.action.stop}
          </Button>
        </div>
      </Stack>

      <PhaseTimeline items={timelineItems} current={currentPhase} label={skupienie.timeline.label} />
    </Stack>
  ) : presets.length > 0 ? (
    <Section title={skupienie.preset.title}>
      <PresetPicker presets={presets} scope="ekran" onStart={handleStart} />
    </Section>
  ) : (
    <EmptyState title={skupienie.empty.title} description={skupienie.empty.description} />
  );

  return (
    <div data-testid={ids.root} className="py-gutter flex flex-col gap-section">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          {/* Nazwa modułu stoi w nagłówku powłoki — powtórzona tutaj zabierałaby
              pierwszy ekran na informację, którą użytkowniczka już widzi. */}
          {currentPhase ? (
            <span>
              <Badge tone={isRunning ? 'module' : 'caution'} data-testid={ids.statusBadge}>
                {isRunning ? skupienie.state.running : skupienie.state.paused}
              </Badge>
            </span>
          ) : (
            <Text size="sm" tone="muted">
              {skupienie.lead}
            </Text>
          )}
        </div>

        <IconButton
          label={skupienie.action.openSettings}
          variant="quiet"
          tone="neutral"
          data-testid={ids.settingsAction}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="w-5 h-5" aria-hidden />
        </IconButton>
      </header>

      <SegmentedTabs
        value={mode}
        onValueChange={setMode}
        label={skupienie.mode.label}
        items={[
          {
            value: 'sesja',
            label: skupienie.mode.session,
            icon: <Clock className="w-4 h-4" data-testid={ids.modeTab('sesja')} aria-hidden />,
          },
          {
            value: 'oddech',
            label: skupienie.mode.breathing,
            icon: <Circle className="w-4 h-4" data-testid={ids.modeTab('oddech')} aria-hidden />,
          },
        ]}
      >
        <TabPanel value="sesja" className="pt-section focus:outline-none">
          {sessionView}
        </TabPanel>
        <TabPanel value="oddech" className="pt-section focus:outline-none">
          <BreathingCircle />
        </TabPanel>
      </SegmentedTabs>

      <AmbienceControls
        active={ambience.active}
        volume={ambience.volume}
        supported={ambience.supported}
        onToggle={handleAmbienceToggle}
        onVolumeChange={ambience.setVolume}
      />

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent size="md">
          <SheetHeader
            title={skupienie.sheet.title}
            description={skupienie.sheet.description}
            closeLabel={common.action.close}
          />
          <SheetBody data-testid={ids.sheet}>
            <Stack gap="lg">
              <Section title={skupienie.sheet.presetSection}>
                <PresetPicker presets={presets} scope="arkusz" onStart={handleStart} />
              </Section>

              <Divider />

              <Section title={skupienie.sheet.soundSection}>
                <Switch
                  checked={autoSound}
                  onCheckedChange={setAutoSound}
                  label={skupienie.sheet.autoSound}
                  hint={skupienie.sheet.autoSoundHint}
                />
              </Section>
            </Stack>
          </SheetBody>
          <SheetFooter>
            <Button
              variant="secondary"
              tone="neutral"
              className="flex-1"
              onClick={() => setSettingsOpen(false)}
            >
              {common.action.done}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
