/**
 * Header Component (Główny Nagłówek i Pasek Nawigacji)
 *
 * Provides:
 * - Brand identity ("Narzędziownik Ani")
 * - Navigation to Hub / Active tool indicator
 * - Background audio/clock active status badge
 * - Quick sensory theme switcher (Szałwia / Ciepły Ciemny / OLED Nocny)
 */

import React from 'react';
import {
  Sparkles,
  Moon,
  Sun,
  Volume2,
  Clock,
} from 'lucide-react';
import { useTheme } from '../core/theme/ThemeContext';

export interface HeaderProps {
  isAudioActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isAudioActive = false,
}) => {
  const { theme, cycleTheme, themeConfig } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-warmgray-900/85 backdrop-blur-md border-b border-warmgray-200/70 dark:border-warmgray-800 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left Section: Logo & Brand or Back Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2.5 text-left p-1.5 -ml-1.5">
            <div className="w-9 h-9 rounded-xl bg-sage-500/15 dark:bg-sage-400/20 text-sage-700 dark:text-sage-300 flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-sage-900 dark:text-sage-100 leading-tight">
                Narzędziownik Ani
              </h1>
              <p className="text-[11px] text-warmgray-500 dark:text-warmgray-400 leading-none">
                Twoja spokojna przestrzeń skupienia
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Status Badges & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Active Audio / Clock Status Badge */}
          {isAudioActive && (
            <div
              data-testid="audio-active-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage-100/90 dark:bg-sage-900/60 text-sage-700 dark:text-sage-300 border border-sage-300/60 dark:border-sage-700/60 text-xs font-medium animate-pulse shadow-sm"
              title="Głos Czasu aktywny w tle"
            >
              <span className="w-2 h-2 rounded-full bg-sage-500 animate-ping" />
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dźwięk aktywny</span>
            </div>
          )}

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={cycleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-warmgray-100 dark:bg-warmgray-800 hover:bg-warmgray-200 dark:hover:bg-warmgray-700 text-warmgray-700 dark:text-warmgray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 shadow-sm"
            aria-label={`Zmień motyw (obecny: ${themeConfig.name})`}
            title={`Motyw: ${themeConfig.name} — kliknij, aby zmienić`}
          >
            {theme === 'sage-calm' && <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
            {theme === 'dark-warm' && <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-300" />}
            {theme === 'oled-night' && <Sparkles className="w-4 h-4 text-emerald-400" />}
            <span className="hidden md:inline">{themeConfig.name}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
