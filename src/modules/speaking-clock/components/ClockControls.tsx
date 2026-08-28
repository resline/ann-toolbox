/**
 * ClockControls Component
 *
 * Primary controls for Starting, Pausing, Resuming, and Stopping the Speaking Clock,
 * along with instant Voice Test and Settings triggers.
 */

import React from 'react';
import { Play, Pause, Square, Volume2, Settings, Loader2 } from '../../../lib/icons';
import { type ClockState } from '../types';

export interface ClockControlsProps {
  clockState: ClockState;
  onStart: () => void | Promise<void>;
  onPause: () => void;
  onResume: () => void | Promise<void>;
  onStop: () => void;
  onTestVoice: () => void | Promise<void>;
  onOpenSettings: () => void;
  isTestingVoice?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ClockControls: React.FC<ClockControlsProps> = ({
  clockState,
  onStart,
  onPause,
  onResume,
  onStop,
  onTestVoice,
  onOpenSettings,
  isTestingVoice = false,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
      {/* Primary Action Buttons */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        {clockState === 'idle' && (
          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className="flex-1 sm:flex-none min-h-[48px] px-6 py-3 rounded-2xl bg-sage-600 hover:bg-sage-700 active:scale-95 text-white font-medium text-base shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start</span>
          </button>
        )}

        {clockState === 'running' && (
          <>
            <button
              type="button"
              onClick={onPause}
              disabled={disabled}
              className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-medium text-base shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Pause className="w-5 h-5" />
              <span>Pauza</span>
            </button>
            <button
              type="button"
              onClick={onStop}
              disabled={disabled}
              className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-2xl bg-warmgray-200/80 hover:bg-warmgray-300/80 dark:bg-warmgray-800 dark:hover:bg-warmgray-750 active:scale-95 text-warmgray-800 dark:text-warmgray-200 border border-warmgray-300/60 dark:border-warmgray-700 font-medium text-base shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Square className="w-5 h-5" />
              <span>Stop</span>
            </button>
          </>
        )}

        {clockState === 'paused' && (
          <>
            <button
              type="button"
              onClick={onResume}
              disabled={disabled}
              className="flex-1 sm:flex-none min-h-[48px] px-6 py-3 rounded-2xl bg-sage-600 hover:bg-sage-700 active:scale-95 text-white font-medium text-base shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Wznów</span>
            </button>
            <button
              type="button"
              onClick={onStop}
              disabled={disabled}
              className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-2xl bg-warmgray-200/80 hover:bg-warmgray-300/80 dark:bg-warmgray-800 dark:hover:bg-warmgray-750 active:scale-95 text-warmgray-800 dark:text-warmgray-200 border border-warmgray-300/60 dark:border-warmgray-700 font-medium text-base shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Square className="w-5 h-5" />
              <span>Stop</span>
            </button>
          </>
        )}
      </div>

      {/* Secondary Action Buttons (Test voice & Settings) */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onTestVoice}
          disabled={isTestingVoice || disabled}
          title="Przetestuj lektora z bieżącymi ustawieniami"
          aria-label="Przetestuj głos teraz"
          className="flex-1 sm:flex-none min-h-[48px] px-4 py-2.5 rounded-2xl bg-white dark:bg-warmgray-850 hover:bg-sage-50 dark:hover:bg-warmgray-800 active:scale-95 text-warmgray-700 dark:text-warmgray-200 border border-warmgray-200/80 dark:border-warmgray-750 text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTestingVoice ? (
            <Loader2 className="w-4 h-4 animate-spin text-sage-600 dark:text-sage-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-sage-600 dark:text-sage-400" />
          )}
          <span>Przetestuj teraz</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          disabled={disabled}
          title="Ustawienia lektora, gongu i trybów"
          aria-label="Ustawienia zegara"
          className="min-h-[48px] min-w-[48px] p-3 rounded-2xl bg-white dark:bg-warmgray-850 hover:bg-sage-50 dark:hover:bg-warmgray-800 active:scale-95 text-warmgray-700 dark:text-warmgray-200 border border-warmgray-200/80 dark:border-warmgray-750 shadow-sm flex items-center justify-center transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5 text-warmgray-600 dark:text-warmgray-300" />
        </button>
      </div>
    </div>
  );
};
export default ClockControls;
