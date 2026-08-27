/**
 * SpeakingClockModule (Głos Czasu)
 *
 * Full UI view for the Speaking Clock tool in Narzędziownik Ani:
 * - Soothing ADHD-friendly visual hierarchy
 * - ClockDisplay, TimeProgressRing, PresetPills, ClockControls, and SettingsModal
 * - Persistent configuration, Web Worker background ticks, and audio sequence integration
 */

import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useSpeakingClock } from './hooks/useSpeakingClock';
import { ClockDisplay } from './components/ClockDisplay';
import { TimeProgressRing } from './components/TimeProgressRing';
import { PresetPills } from './components/PresetPills';
import { ClockControls } from './components/ClockControls';
import { ClockSettingsModal } from './components/ClockSettingsModal';

export interface SpeakingClockModuleProps {
  className?: string;
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
    start,
    pause,
    resume,
    stop,
    updateSettings,
    testVoiceNow,
    setIntervalMinutes,
  } = useSpeakingClock();

  return (
    <div className={`w-full max-w-2xl mx-auto space-y-5 p-2 sm:p-4 ${className}`}>
      {/* Module Header */}
      <header className="flex items-center gap-3.5 pb-2">
        <div className="w-12 h-12 rounded-2xl bg-sage-100 dark:bg-sage-900/60 flex items-center justify-center text-sage-600 dark:text-sage-300 shadow-sm shrink-0">
          <Volume2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-sage-900 dark:text-sage-100">
            Głos Czasu
          </h1>
          <p className="text-xs sm:text-sm text-warmgray-600 dark:text-warmgray-400">
            Dyskretny mówiący zegar w tle dla lepszego poczucia upływu czasu.
          </p>
        </div>
      </header>

      {/* Main Grid: Clock & Progress Ring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Interval Presets Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-warmgray-850/60 backdrop-blur-sm border border-warmgray-200/70 dark:border-warmgray-800 shadow-sm">
        <PresetPills
          intervalMinutes={settings.intervalMinutes}
          onSelectInterval={setIntervalMinutes}
        />
      </div>

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
