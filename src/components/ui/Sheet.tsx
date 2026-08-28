import React, { createContext, useContext } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, type PanInfo } from 'framer-motion';
import { X } from '../../lib/icons';
import { cn } from '../../lib/cn';
import { MEDIA_WIDE, useMediaQuery } from '../../lib/useMediaQuery';
import { useSheetHistory } from '../../lib/useSheetHistory';
import { useMotionPreference } from '../../lib/motion';
import { IconButton } from './IconButton';
import { Heading, Text } from './Text';

interface SheetContextValue {
  open: boolean;
  close: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext(component: string): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error(`${component} musi być użyty wewnątrz <Sheet>`);
  return ctx;
}

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Jeden arkusz zamiast dziewięciu ręcznych overlayów.
 *
 * Radix dostarcza to, czego nie miał żaden z nich: portal, pułapkę fokusu,
 * przywrócenie fokusu po zamknięciu, Escape, kliknięcie w tło i blokadę
 * przewijania strony pod spodem.
 *
 * Na telefonie wysuwa się od dołu (kciuk sięga do akcji), na szerszym ekranie
 * jest wyśrodkowanym oknem — jeden komponent, nie dwa.
 */
export const Sheet: React.FC<SheetProps> = ({ open, onOpenChange, children }) => {
  useSheetHistory(open, () => onOpenChange(false));

  return (
    <SheetContext.Provider value={{ open, close: () => onOpenChange(false) }}>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog.Root>
    </SheetContext.Provider>
  );
};

export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export type SheetSize = 'sm' | 'md' | 'full';

const WIDE_SIZE: Record<SheetSize, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-lg',
  full: 'md:max-w-2xl',
};

const TALL_SIZE: Record<SheetSize, string> = {
  sm: 'max-h-[60dvh]',
  md: 'max-h-[88dvh]',
  full: 'h-[94dvh]',
};

export interface SheetContentProps {
  size?: SheetSize;
  /** Etykieta dla czytnika ekranu, gdy arkusz nie ma widocznego tytułu. */
  label?: string;
  className?: string;
  children: React.ReactNode;
}

export const SheetContent: React.FC<SheetContentProps> = ({
  size = 'md',
  label,
  className,
  children,
}) => {
  const { close } = useSheetContext('SheetContent');
  const wide = useMediaQuery(MEDIA_WIDE);
  const { reduced } = useMotionPreference();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // zamknięcie gestem tylko w dół i tylko przy wyraźnym zamiarze
    if (info.offset.y > 120 || info.velocity.y > 600) close();
  };

  // Obecnością steruje Radix — inaczej fokus nie wraca na element otwierający.
  // Animacja idzie CSS-em po data-state (patrz src/design/motion.css).
  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className="anim-overlay fixed inset-0 z-50 bg-[rgb(var(--ink)/0.35)] backdrop-blur-[2px]"
      />

      <Dialog.Content
        aria-label={label}
        className={cn(
          'anim-sheet fixed z-50 flex flex-col bg-surface text-ink outline-none shadow-sheet',
          'inset-x-0 bottom-0 rounded-t-sheet pb-safe',
          'md:inset-0 md:m-auto md:h-fit md:w-[calc(100%-2rem)] md:rounded-sheet md:pb-0',
          TALL_SIZE[size],
          WIDE_SIZE[size],
          className
        )}
      >
        {!wide && !reduced ? (
          // Uchwyt jest jednocześnie obszarem gestu — przeciągnięcie w dół
          // zamyka arkusz, co na telefonie jest szybsze niż sięganie do X.
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="shrink-0 flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing touch-none"
            aria-hidden
          >
            <span className="h-1 w-9 rounded-full bg-line-strong" />
          </motion.div>
        ) : !wide ? (
          <div className="shrink-0 flex justify-center pt-2.5 pb-1" aria-hidden>
            <span className="h-1 w-9 rounded-full bg-line-strong" />
          </div>
        ) : null}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
};

export interface SheetHeaderProps {
  title: string;
  description?: string;
  /** Etykieta przycisku zamykania — polska, zawsze. */
  closeLabel?: string;
  className?: string;
}

export const SheetHeader: React.FC<SheetHeaderProps> = ({
  title,
  description,
  closeLabel = 'Zamknij',
  className,
}) => (
  <div className={cn('shrink-0 flex items-start justify-between gap-3 px-gutter pt-4 pb-3', className)}>
    <div className="flex flex-col gap-1 min-w-0">
      <Dialog.Title asChild>
        <Heading level={2}>{title}</Heading>
      </Dialog.Title>
      {description ? (
        <Dialog.Description asChild>
          <Text size="sm" tone="muted">
            {description}
          </Text>
        </Dialog.Description>
      ) : null}
    </div>
    <Dialog.Close asChild>
      <IconButton label={closeLabel} variant="ghost" tone="neutral" size="sm">
        <X className="w-5 h-5" aria-hidden />
      </IconButton>
    </Dialog.Close>
  </div>
);

/** Jedyny obszar przewijany w arkuszu — nagłówek i stopka zostają na miejscu. */
export const SheetBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...rest
}) => (
  <div
    className={cn('flex-1 overflow-y-auto overscroll-contain px-gutter pb-4', className)}
    {...rest}
  />
);

export const SheetFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...rest
}) => (
  <div
    className={cn(
      'shrink-0 flex items-center gap-2 px-gutter py-3 bg-surface',
      'shadow-[0_-1px_0_0_rgb(var(--line))]',
      className
    )}
    {...rest}
  />
);
