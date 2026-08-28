import React, { useEffect, useState } from 'react';
import { Settings2 } from '../lib/icons';
import { cn } from '../lib/cn';
import { app } from '../copy';
import { IconButton } from '../components/ui';
import { useRoute } from './router';
import { shellIds } from './testIds';

/** Hairline pod nagłówkiem pojawia się dopiero, gdy jest co oddzielać. */
function useScrolled(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export interface AppHeaderProps {
  onOpenSettings: () => void;
}

/**
 * Nagłówek kontekstowy: na ekranie startowym pokazuje markę, w module — nazwę
 * modułu. Wcześniej zawsze mówił to samo, więc nie niósł żadnej informacji o
 * tym, gdzie się jest.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenSettings }) => {
  const route = useRoute();
  const scrolled = useScrolled();
  const isHome = route.module === null;

  return (
    <header
      data-testid={shellIds.header}
      className={cn(
        'sticky top-0 z-30 h-14 flex items-center justify-between gap-3 px-gutter',
        'bg-canvas/90 backdrop-blur-md transition-shadow',
        scrolled && 'shadow-[0_1px_0_0_rgb(var(--line))]'
      )}
    >
      <div className="min-w-0 flex flex-col">
        <h1 data-testid={shellIds.headerTitle} className="text-base font-semibold tracking-tight text-ink truncate">
          {isHome ? app.name : route.label}
        </h1>
      </div>

      <IconButton
        data-testid={shellIds.settingsButton}
        label={app.nav.openSettings}
        variant="ghost"
        tone="neutral"
        size="sm"
        onClick={onOpenSettings}
      >
        <Settings2 className="w-5 h-5" aria-hidden />
      </IconButton>
    </header>
  );
};
