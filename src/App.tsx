/**
 * App Component (Główny Kontener Aplikacji Narzędziownik Ani)
 *
 * Core coordinator:
 * - ThemeProvider wrapping (Szałwia / Ciepły Ciemny / OLED Nocny)
 * - Navigation between Hub Dashboard and Active Tools (Głos Czasu)
 * - PWA beforeinstallprompt lifecycle handling (Install banner)
 * - Sensory calm layout and styling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Heart, ShieldCheck } from 'lucide-react';
import { ThemeProvider } from './core/theme/ThemeContext';
import { Header } from './components/Header';
import { HubDashboard } from './components/HubDashboard';
import { getToolById } from './core/registry';
import { SpeakingClockModule } from './modules/speaking-clock/SpeakingClockModule';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const AppContent: React.FC = () => {
  // Default to speaking-clock for immediate access, or allow switching to hub
  const [activeToolId, setActiveToolId] = useState<string | null>('speaking-clock');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallDismissed, setIsInstallDismissed] = useState<boolean>(false);
  const [isAudioActive] = useState<boolean>(false);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch {
      // Ignore prompt errors
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleNavigateToHub = useCallback(() => {
    setActiveToolId('hub');
  }, []);

  const handleSelectTool = useCallback((toolId: string) => {
    setActiveToolId(toolId);
  }, []);

  // Determine active view component
  const currentTool = activeToolId && activeToolId !== 'hub' ? getToolById(activeToolId) : null;
  const ToolComponent = currentTool?.component || SpeakingClockModule;

  return (
    <div className="min-h-screen flex flex-col bg-warmgray-100 dark:bg-warmgray-900 text-warmgray-800 dark:text-warmgray-100 selection:bg-sage-200 selection:text-sage-900 transition-colors duration-200">
      {/* PWA Install Banner */}
      {deferredPrompt && !isInstallDismissed && (
        <div
          data-testid="pwa-install-banner"
          className="bg-sage-600 dark:bg-sage-800 text-white px-4 py-2.5 shadow-md transition-all duration-300"
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-sage-100" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  Zainstaluj Narzędziownik na telefonie
                </p>
                <p className="text-xs text-sage-100/90 hidden xs:block">
                  Szybki dostęp z ekranu głównego i niezawodne działanie offline.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-4 py-1.5 rounded-xl bg-white text-sage-900 font-semibold text-xs hover:bg-sage-50 active:scale-95 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Zainstaluj aplikację
              </button>
              <button
                type="button"
                onClick={() => setIsInstallDismissed(true)}
                className="p-1.5 rounded-lg text-sage-200 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Pomiń instalację"
                title="Pomiń instalację"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        activeToolId={activeToolId}
        onNavigateToHub={handleNavigateToHub}
        isAudioActive={isAudioActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeToolId === 'hub' ? (
          <HubDashboard onSelectTool={handleSelectTool} />
        ) : (
          <ToolComponent />
        )}
      </main>

      {/* Calm Footer */}
      <footer className="w-full border-t border-warmgray-200/60 dark:border-warmgray-800/80 bg-white/40 dark:bg-warmgray-900/40 backdrop-blur-sm py-4 px-4 text-center text-xs text-warmgray-500 dark:text-warmgray-400">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span>Stworzone z</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>dla Ani</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sage-600 dark:text-sage-400" />
              100% Offline & Prywatność
            </span>
            <span>•</span>
            <span>Wersja PWA v0.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
