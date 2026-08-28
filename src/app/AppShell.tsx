import React, { useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { getToolById } from '../core/registry';
import { useMotionPreference, dur, ease } from '../lib/motion';
import { AppHeader } from './AppHeader';
import { InstallPrompt } from './InstallPrompt';
import { NowScreen } from './NowScreen';
import { SettingsSheet } from './SettingsSheet';
import { TabBar } from './TabBar';
import { useRoute } from './router';
import { shellIds } from './testIds';

const APP_VERSION = '0.2.0';

/**
 * Powłoka aplikacji.
 *
 * Trzy warstwy chromu (nagłówek, stopka, dolna nawigacja) zeszły do dwóch —
 * stopka zniknęła, a jej treść jest w ustawieniach. Dzięki temu odpadł cały
 * stos doraźnych paddingów (pb-28 / pb-24 / pb-safe) na rzecz jednej reguły.
 */
export const AppShell: React.FC = () => {
  const route = useRoute();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { reduced } = useMotionPreference();

  const tool = route.toolId ? getToolById(route.toolId) : null;
  const ToolComponent = tool?.component;

  return (
    // Jeden MotionConfig degraduje całe drzewo naraz — bez rozgałęzień
    // `if (reduced)` w każdym komponencie z osobna.
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'} transition={{ duration: dur.base, ease: ease.out }}>
      <div
        data-testid={shellIds.root}
        data-module={route.module ?? undefined}
        className="min-h-[100dvh] bg-canvas text-ink flex flex-col"
      >
        <InstallPrompt />
        <AppHeader onOpenSettings={() => setSettingsOpen(true)} />

        <main
          data-testid={shellIds.main}
          className="flex-1 w-full max-w-lg mx-auto px-gutter"
          style={{
            paddingBottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 16px)',
          }}
        >
          {ToolComponent ? <ToolComponent /> : <NowScreen />}
        </main>

        <TabBar />

        <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} version={APP_VERSION} />
      </div>
    </MotionConfig>
  );
};
