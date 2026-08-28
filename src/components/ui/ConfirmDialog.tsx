import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { cn } from '../../lib/cn';
import { Heading, Text } from './Text';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Ton przycisku potwierdzenia — `attention` dla działań nieodwracalnych. */
  tone?: 'accent' | 'attention';
}

/**
 * Potwierdzenie działania nieodwracalnego. AlertDialog Radiksa nie zamyka się
 * kliknięciem w tło ani Escape-em bez wyboru, co przy usuwaniu jest właściwe.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Anuluj',
  onConfirm,
  tone = 'attention',
}) => (
  <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="anim-overlay fixed inset-0 z-50 bg-[rgb(var(--ink)/0.35)] backdrop-blur-[2px]" />
      <AlertDialog.Content
        className={cn(
          'anim-sheet fixed z-50 inset-x-0 bottom-0 rounded-t-sheet pb-safe',
          'md:inset-0 md:m-auto md:h-fit md:w-[calc(100%-2rem)] md:max-w-sm md:rounded-sheet md:pb-0',
          'bg-surface text-ink shadow-sheet outline-none p-gutter flex flex-col gap-3'
        )}
      >
        <AlertDialog.Title asChild>
          <Heading level={2}>{title}</Heading>
        </AlertDialog.Title>
        {description ? (
          <AlertDialog.Description asChild>
            <Text size="sm" tone="muted">
              {description}
            </Text>
          </AlertDialog.Description>
        ) : null}
        <div className="flex gap-2 pt-2">
          <AlertDialog.Cancel asChild>
            <Button variant="quiet" tone="neutral" className="flex-1">
              {cancelLabel}
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action asChild>
            <Button variant="primary" tone={tone} className="flex-1" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
