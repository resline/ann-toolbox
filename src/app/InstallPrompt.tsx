import React, { useCallback, useEffect, useState } from 'react';
import { Download, X } from '../lib/icons';
import { app } from '../copy';
import { Button, IconButton, Text } from '../components/ui';
import { shellIds } from './testIds';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

/** Pasek instalacji PWA — wyjęty z App.tsx, żeby powłoka została powłoką. */
export const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* przerwane przez przeglądarkę — pasek i tak znika */
    } finally {
      setDeferred(null);
    }
  }, [deferred]);

  if (!deferred || dismissed) return null;

  return (
    <div
      data-testid={shellIds.installBanner}
      className="bg-accent-soft text-accent-ink px-gutter py-3 flex flex-col gap-2.5"
    >
      <div className="flex items-start gap-3">
        <Download className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{app.install.title}</p>
          <Text size="xs" tone="accent" className="opacity-80 leading-snug">
            {app.install.body}
          </Text>
        </div>
        <IconButton
          data-testid={shellIds.installDismiss}
          label={app.install.dismiss}
          size="sm"
          variant="ghost"
          tone="accent"
          onClick={() => setDismissed(true)}
          className="-mt-1 -mr-1"
        >
          <X className="w-4 h-4" aria-hidden />
        </IconButton>
      </div>
      <Button
        data-testid={shellIds.installAccept}
        size="sm"
        variant="primary"
        tone="accent"
        onClick={handleInstall}
        className="self-start"
      >
        {app.install.confirm}
      </Button>
    </div>
  );
};
