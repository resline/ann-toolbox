import React, { useEffect, useId, useRef, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Edit2, MoreVertical, Star, Trash2 } from '../../../lib/icons';
import { cn } from '../../../lib/cn';
import { Badge, Button, Card, Heading, IconButton } from '../../../components/ui';
import { common, energia } from '../../../copy';
import { energiaIds as ids } from '../testIds';
import { DopamineItem } from '../types';

export interface DopamineCardProps {
  item: DopamineItem;
  onOpen: (item: DopamineItem) => void;
  onDone: (item: DopamineItem) => void;
  onToggleFavorite: (item: DopamineItem) => void;
  onEdit: (item: DopamineItem) => void;
  onRemove: (item: DopamineItem) => void;
}

const MENU_ITEM =
  'flex items-center gap-2 w-full min-h-tap px-3 text-sm rounded-control cursor-default outline-none ' +
  'data-[highlighted]:bg-surface-hover';

/**
 * Karta pozycji menu.
 *
 * Wcześniej był to `<div role="button">` z czterema zagnieżdżonymi przyciskami
 * w środku — niepoprawny DOM i pułapka fokusowa. Teraz jest to `<article>`
 * z jedną akcją główną i trzema pobocznymi obok niej.
 *
 * Nagłówek jest NA ZEWNĄTRZ przycisku, a przycisk w środku nagłówka: `<h3>`
 * przyjmuje treść fraz, `<button>` nie przyjmuje treści przepływowej, więc
 * odwrotne zagnieżdżenie (`<button><h3>`) było niepoprawne. Przycisk ma pełne
 * `min-h-tap` — to najczęściej dotykany element w module i jedyny, który
 * wcześniej łamał ten standard.
 *
 * Opisu tu nie ma celowo: menu przegląda się wzrokiem po nazwach, a pełny opis
 * czeka w arkuszu szczegółów.
 */
export const DopamineCard: React.FC<DopamineCardProps> = ({
  item,
  onOpen,
  onDone,
  onToggleFavorite,
  onEdit,
  onRemove,
}) => {
  const titleId = useId();
  const [justDone, setJustDone] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  const handleDone = () => {
    onDone(item);
    setJustDone(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setJustDone(false), 1800);
  };

  const favorite = !!item.isFavorite;

  return (
    <Card
      as="article"
      aria-labelledby={titleId}
      data-testid={ids.card(item.id)}
      className={cn(
        'flex flex-col transition-shadow',
        favorite && 'shadow-[0_0_0_1px_rgb(var(--module))]'
      )}
    >
      <div className="flex items-start gap-1 px-card pt-card">
        <Heading level={3} id={titleId} className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onOpen(item)}
            data-testid={ids.cardOpen(item.id)}
            aria-label={energia.card.open(item.title)}
            className={cn(
              'w-full min-h-tap flex items-center text-left rounded-control px-2 -mx-2 py-1.5',
              'transition-colors hover:bg-surface-hover active:bg-surface-active',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]'
            )}
          >
            <span className="line-clamp-2">{item.title}</span>
          </button>
        </Heading>

        <IconButton
          variant="ghost"
          tone={favorite ? 'module' : 'neutral'}
          label={favorite ? energia.action.unfavorite : energia.action.favorite}
          aria-pressed={favorite}
          data-testid={ids.cardFavorite(item.id)}
          onClick={() => onToggleFavorite(item)}
        >
          <Star className={cn('w-5 h-5', favorite && 'fill-current')} aria-hidden />
        </IconButton>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton
              variant="ghost"
              tone="neutral"
              label={energia.action.more}
              data-testid={ids.cardMenu(item.id)}
            >
              <MoreVertical className="w-5 h-5" aria-hidden />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-[11rem] p-1 rounded-card bg-surface-raised text-ink shadow-sheet outline-none"
            >
              <DropdownMenu.Item
                className={MENU_ITEM}
                data-testid={ids.cardEdit(item.id)}
                onSelect={() => onEdit(item)}
              >
                <Edit2 className="w-4 h-4" aria-hidden />
                {common.action.edit}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={cn(MENU_ITEM, 'text-attention-ink')}
                data-testid={ids.cardRemove(item.id)}
                onSelect={() => onRemove(item)}
              >
                <Trash2 className="w-4 h-4" aria-hidden />
                {common.action.remove}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="flex items-center justify-between gap-2 px-card pb-card pt-3">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {item.durationMinutes ? (
            <Badge tone="neutral">{energia.card.duration(item.durationMinutes)}</Badge>
          ) : null}
          <Badge tone="module">{energia.energy[item.energyRequired].badge}</Badge>
        </div>

        <Button
          variant={justDone ? 'primary' : 'secondary'}
          tone="module"
          data-testid={ids.cardDone(item.id)}
          onClick={handleDone}
          className="shrink-0"
        >
          {justDone ? <Check className="w-4 h-4" aria-hidden /> : null}
          {energia.action.done}
        </Button>
      </div>
    </Card>
  );
};
