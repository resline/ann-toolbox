import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from '../../../lib/icons';
import {
  Card,
  ConfirmDialog,
  Divider,
  IconButton,
  LabelText,
  Text,
} from '../../../components/ui';
import { common, energia } from '../../../copy';
import { useDopamineMenuStore } from '../store';
import { energiaIds as ids } from '../testIds';

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Bank iskierek — jedyne miejsce w module z dużą liczbą.
 *
 * Odmianę prowadzi `plCount`/`plWith`; wcześniejsze doraźne wyrażenie dawało
 * „5 iskierk" i „22 iskierk".
 */
export const DopamineBankWidget: React.FC = () => {
  const completedToday = useDopamineMenuStore((state) => state.completedToday) || [];
  const resetCompletedToday = useDopamineMenuStore((state) => state.resetCompletedToday);
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const count = completedToday.length;

  return (
    <Card as="section" aria-label={energia.bank.summary(count)} data-testid={ids.bank}>
      <div className="flex items-center justify-between gap-3 px-card py-card">
        <div className="flex flex-col gap-0.5 min-w-0">
          <LabelText>{energia.bank.label}</LabelText>
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className="numeric text-display-1 font-medium text-ink leading-none"
              data-testid={ids.bankCount}
            >
              {count}
            </span>
            <Text tone="muted" className="truncate">
              {count === 0 ? energia.bank.first : energia.bank.unit(count)}
            </Text>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {count > 0 ? (
            <IconButton
              variant="ghost"
              tone="neutral"
              label={energia.bank.clear}
              data-testid={ids.bankClear}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="w-5 h-5" aria-hidden />
            </IconButton>
          ) : null}
          <IconButton
            variant="ghost"
            tone="neutral"
            label={expanded ? energia.bank.collapse : energia.bank.expand}
            aria-expanded={expanded}
            disabled={count === 0}
            data-testid={ids.bankToggle}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5" aria-hidden />
            ) : (
              <ChevronDown className="w-5 h-5" aria-hidden />
            )}
          </IconButton>
        </div>
      </div>

      {expanded && count > 0 ? (
        <>
          <Divider />
          <ul className="px-card py-2" data-testid={ids.bankList}>
            {completedToday.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-3 py-1.5">
                <Text size="sm" as="span" className="min-w-0 truncate">
                  {entry.title}
                </Text>
                <Text size="xs" tone="faint" as="span" className="numeric shrink-0">
                  {formatTime(entry.timestamp)}
                </Text>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={energia.bank.clearTitle}
        description={energia.bank.clearBody}
        confirmLabel={common.action.remove}
        cancelLabel={common.action.cancel}
        onConfirm={() => {
          resetCompletedToday();
          setExpanded(false);
        }}
      />
    </Card>
  );
};
