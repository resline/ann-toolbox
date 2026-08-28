/**
 * SpeakingClockModule (Kotwica Czasu / Głos Czasu)
 *
 * Full UI view for the Time Anchor tool in Narzędziownik Ani:
 * - Soothing ADHD-friendly visual hierarchy & large touch targets (>= 48px)
 * - ModeTabs: Zegar Ciągły (Continuous), Sesja Focus, Do Godziny (Departure Countdown)
 * - Authentic visual Time Timer disc with soothing color palettes & rim numerals
 * - DepartureConfig with quick relative presets (+15m, +30m, +45m, +1h), activity tags, and smart density
 * - QuickTimeAdjusters (-5m, +1m, +5m, +10m) active during running countdowns
 * - Fallback digital ClockDisplay & TimeProgressRing when Time Timer is disabled
 * - Persistent configuration, Web Worker background ticks, and audio sequence integration
 */

import React, { useState } from 'react';
import { Volume2, Footprints, SlidersHorizontal } from '../../lib/icons';
import { useSpeakingClock } from './hooks/useSpeakingClock';
import { ModeTabs } from './components/ModeTabs';
import { DepartureConfig } from './components/DepartureConfig';
import { TimeTimerDisc } from './components/TimeTimerDisc';
import { ClockDisplay } from './components/ClockDisplay';
import { TimeProgressRing } from './components/TimeProgressRing';
import { PresetPills } from './components/PresetPills';
import { QuickTimeAdjusters } from './components/QuickTimeAdjusters';
import { ClockControls } from './components/ClockControls';
import { ClockSettingsModal } from './components/ClockSettingsModal';

export interface SpeakingClockModuleProps {
  className?: string;
}

/**
 * Formats seconds into MM:SS or H:MM:SS string.
 */
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

/**
 * Formats date into HH:MM:SS string.
 */
function formatTimeToHHMMSS(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export const SpeakingClockModule: React.FC<SpeakingClockModuleProps> = ({
  className = '',
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const {
    clockState,
    currentTime,
    nextAnnouncementTime,
    secondsUntilNext,
    progress,
    settings,
    lastAnnouncementText,
    focusRemainingSeconds,
    availableVoices,
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
    setIntervalMinutes,
    setMode,
    addMinutes,
  } = useSpeakingClock();

  const isRunning = clockState === 'running';
  const isPaused = clockState === 'paused';
  const isTimeTimerEnabled = settings.timeTimer?.enabled ?? true;

  // Determine central display readouts for Time Timer Disc
  let discCenterLabel = 'Zegar';
  let discCenterTime = formatTimeToHHMMSS(currentTime);
  let discCenterSublabel: string | undefined = `co ${settings.intervalMinutes} min`;

  if (settings.mode === 'departure') {
    discCenterLabel = 'Do wyjścia';
    discCenterTime = formatSecondsToDigital(secondsRemaining);
    const cadence = settings.departure?.smartDensity
      ? 'Smart'
      : `co ${settings.departure?.intervalMinutes || 2}m`;
    discCenterSublabel = `${departureLabel || 'Wyjście'} • ${cadence}`;
  } else if (settings.mode === 'focus') {
    discCenterLabel = 'Skupienie';
    discCenterTime = formatSecondsToDigital(secondsRemaining);
    discCenterSublabel = `${settings.focusDurationMinutes} min sesja`;
  } else if (isRunning || isPaused) {
    discCenterLabel = 'Następny';
    discCenterTime = formatSecondsToDigital(secondsUntilNext);
    discCenterSublabel = `co ${settings.intervalMinutes} min`;
  }

  return (
    <div className={`w-full max-w-2xl mx-auto space-y-4 sm:space-y-5 p-2 sm:p-4 ${className}`}>
      {/* Module Header */}
      <header className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sage-100 dark:bg-sage-900/60 flex items-center justify-center text-sage-600 dark:text-sage-300 shadow-sm shrink-0">
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-sage-900 dark:text-sage-100 truncate">
                Kotwica Czasu
              </h1>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${
                  isRunning
                    ? 'bg-sage-100 dark:bg-sage-900/80 text-sage-800 dark:text-sage-200 border border-sage-300 dark:border-sage-700 animate-pulse'
                    : isPaused
                    ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : 'bg-warmgray-100 dark:bg-warmgray-800 text-warmgray-600 dark:text-warmgray-400 border border-warmgray-200 dark:border-warmgray-700'
                }`}
              >
                {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-sage-600 dark:bg-sage-400 animate-ping" />}
                <span>{isRunning ? 'Działa w tle' : isPaused ? 'Wstrzymany' : 'Gotowy'}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-warmgray-600 dark:text-warmgray-400 truncate">
              Dyskretny mówiący zegar, odliczanie i Time Timer dla poczucia czasu.
            </p>
          </div>
        </div>

        {/* Quick Test Voice & Settings buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={testVoiceNow}
            disabled={isTestingVoice}
            aria-label="Przetestuj głos lektora"
            title="Przetestuj głos lektora"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-white dark:bg-warmgray-850 hover:bg-sage-50 dark:hover:bg-warmgray-800 border border-warmgray-200 dark:border-warmgray-750 text-warmgray-700 dark:text-warmgray-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Volume2 className={`w-4 h-4 text-sage-600 dark:text-sage-400 ${isTestingVoice ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Test głosu</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Otwórz ustawienia zegara"
            title="Ustawienia Kotwicy Czasu"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-white dark:bg-warmgray-850 hover:bg-sage-50 dark:hover:bg-warmgray-800 border border-warmgray-200 dark:border-warmgray-750 text-warmgray-700 dark:text-warmgray-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-sage-600 dark:text-sage-400" />
            <span className="hidden md:inline">Ustawienia</span>
          </button>
        </div>
      </header>

      {/* Mode Selector Tabs */}
      <ModeTabs
        activeMode={settings.mode}
        onModeChange={setMode}
        disabled={isRunning}
      />

      {/* Departure Mode Configuration Card (when idle) or Active Target Header (when running) */}
      {settings.mode === 'departure' && (
        <div className="">
          {clockState === 'idle' ? (
            <DepartureConfig
              settings={settings.departure}
              onChange={setDepartureSettings}
              disabled={isRunning}
            />
          ) : (
            <div className="p-4 rounded-3xl bg-white/80 dark:bg-warmgray-850/70 backdrop-blur-sm border border-warmgray-200/80 dark:border-warmgray-800 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sage-100 dark:bg-sage-900/60 flex items-center justify-center text-sage-600 dark:text-sage-400 shrink-0">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-warmgray-500 dark:text-warmgray-400">
                    Cel wyjścia:
                  </div>
                  <div className="text-sm sm:text-base font-bold text-warmgray-900 dark:text-warmgray-100 flex flex-wrap items-center gap-1.5">
                    <span>{departureLabel} o <span className="font-mono text-sage-700 dark:text-sage-300">{targetTime}</span></span>
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-sage-50 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300 border border-sage-200 dark:border-sage-800">
                      {settings.departure?.smartDensity ? 'Smart' : `co ${settings.departure?.intervalMinutes || 2} min`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-warmgray-500 dark:text-warmgray-400 font-medium">Pozostało:</div>
                <div className="font-mono font-extrabold text-base sm:text-lg text-sage-700 dark:text-sage-300">
                  {formatSecondsToDigital(secondsRemaining)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Central Visual Display: Time Timer Disc OR Digital Clock & Progress Ring */}
      <div className="relative">
        {/* Animated Voice Pulse Soundwave Ring */}
        {isTestingVoice && (
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
            <div className="w-[320px] h-[320px] rounded-full border-[6px] border-sage-300/40 dark:border-sage-500/30 animate-ping" />
            <div className="absolute w-[360px] h-[360px] rounded-full border-4 border-sage-200/30 dark:border-sage-600/20 animate-pulse delay-150" style={{ animationDuration: '2s' }} />
          </div>
        )}

        {isTimeTimerEnabled ? (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-warmgray-850/70 backdrop-blur-sm border border-warmgray-200/80 dark:border-warmgray-800 shadow-sm transition-all">
            <TimeTimerDisc
              totalSeconds={totalSpanSeconds}
              secondsRemaining={secondsRemaining}
              color={settings.timeTimer?.color || 'sage'}
              showNumbers={settings.timeTimer?.showNumbers ?? true}
              direction={settings.timeTimer?.direction || 'counter-clockwise'}
              isActive={isRunning}
              centerLabel={discCenterLabel}
              centerTimeText={discCenterTime}
              centerSublabel={discCenterSublabel}
              size={280}
            />
          </div>
        ) : (
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ClockDisplay currentTime={currentTime} clockState={clockState} />
            <TimeProgressRing
              secondsUntilNext={secondsUntilNext}
              nextAnnouncementTime={nextAnnouncementTime}
              progress={progress}
              clockState={clockState}
              mode={settings.mode}
              focusRemainingSeconds={focusRemainingSeconds}
              lastAnnouncementText={lastAnnouncementText}
            />
          </div>
        )}
      </div>

      {/* Preset Pills (in Continuous mode) */}
      {settings.mode === 'continuous' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-warmgray-850/60 backdrop-blur-sm border border-warmgray-200/70 dark:border-warmgray-800 shadow-sm">
          <PresetPills
            intervalMinutes={settings.intervalMinutes}
            onSelectInterval={setIntervalMinutes}
          />
        </div>
      )}

      {/* Quick Time Adjusters (-5m, +1m, +5m, +10m) shown when running in Departure or Focus mode */}
      {(isRunning || isPaused) && (settings.mode === 'departure' || settings.mode === 'focus') && (
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-warmgray-850/60 backdrop-blur-sm border border-warmgray-200/70 dark:border-warmgray-800 shadow-sm">
          <QuickTimeAdjusters onAdjustMinutes={addMinutes} />
        </div>
      )}

      {/* Primary Clock Controls */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-warmgray-850/60 backdrop-blur-sm border border-warmgray-200/70 dark:border-warmgray-800 shadow-sm">
        <ClockControls
          clockState={clockState}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onStop={stop}
          onTestVoice={testVoiceNow}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isTestingVoice={isTestingVoice}
        />
      </div>

      {/* Settings Modal */}
      <ClockSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        availableVoices={availableVoices}
        onTestVoice={testVoiceNow}
      />
    </div>
  );
};
export default SpeakingClockModule;

